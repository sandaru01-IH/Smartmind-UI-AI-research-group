'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';
import { RoadSim, SELECT_LIFE } from '@/lib/sim/sim';
import {
  coverFrame,
  depthField,
  layerToView,
  viewToLayer,
  type DepthField,
} from '@/lib/sim/static-network';

interface Palette {
  agent: string;
  flood: string;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string) => css.getPropertyValue(name).trim();
  const light = document.documentElement.dataset.theme === 'light';
  return {
    agent: light ? get('--fg') : get('--signal'),
    flood: light ? get('--flood-ink') : get('--flood'),
  };
}

/** A few travellers, not a swarm. Shed further at run time if frames run long. */
function agentBudget(width: number): number {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) return 8;
  if (width < 768) return 12;
  return 22;
}

/**
 * Pointer response and a small number of slow agents, drawn on the same sheets as the static SVG.
 * Roads themselves stay in the SVG, so the canvas never paints a second network over the first.
 */
export function HeroCanvas({ onReady }: { onReady?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    let visible = true;
    let field: DepthField[] = [];
    let sims: RoadSim[] = [];
    let palette = readPalette();
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let ox = 0;
    let oy = 0;
    let cover = 1;
    let slowFrames = 0;
    let last = performance.now();

    const frontSim = () => sims.find((s, i) => field[i]?.spec.live) ?? null;

    const layout = () => {
      const rect = host.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const frame = coverFrame(cssW, cssH);
      ox = frame.ox;
      oy = frame.oy;
      cover = frame.scale;
    };

    const screenOf = (x: number, y: number, spec: DepthField['spec']) => {
      const v = layerToView(x, y, spec);
      return { x: ox + v.x * cover, y: oy + v.y * cover };
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.strokeStyle = palette.flood;
      ctx.fillStyle = palette.flood;

      for (let i = 0; i < sims.length; i++) {
        const sim = sims[i];
        const spec = field[i].spec;
        const g = sim.graph;
        const strength = spec.live ? 0.62 : spec.road * 1.15;
        for (const sel of sim.selections) {
          const fade = 1 - Math.pow(sel.age / SELECT_LIFE, 2);
          const line = (edge: number, width: number, alpha: number) => {
            const e = g.edges[edge];
            const a = screenOf(g.nodes[e.a].x, g.nodes[e.a].y, spec);
            const b = screenOf(g.nodes[e.b].x, g.nodes[e.b].y, spec);
            ctx.globalAlpha = alpha * fade;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          };
          for (const edge of sim.connectedEdges(sel.edge)) {
            if (edge !== sel.edge) line(edge, Math.max(1, cover * 0.28), strength * 0.55);
          }
          line(sel.edge, Math.max(1.6, cover * 0.48), strength);
        }
      }

      const live = frontSim();
      const liveSpec = field.find((layer) => layer.spec.live)?.spec;
      if (live && liveSpec) {
        const g = live.graph;
        const rad = Math.max(1.7, cover * 0.26);
        ctx.fillStyle = palette.agent;
        ctx.globalAlpha = 0.5;
        for (const a of live.agents) {
          const from = g.nodes[a.from];
          const to = g.nodes[a.to];
          const p = screenOf(
            from.x + (to.x - from.x) * a.t,
            from.y + (to.y - from.y) * a.t,
            liveSpec,
          );
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const build = () => {
      layout();
      palette = readPalette();
      if (sims.length === 0) {
        field = depthField();
        const budget = agentBudget(cssW);
        sims = field.map(
          (layer) =>
            new RoadSim({
              graph: layer.graph,
              agentCount: layer.spec.live ? budget : 0,
              seed: layer.spec.seed,
              centrality: layer.centrality,
              pace: layer.spec.live ? 0.28 : 1,
            }),
        );
      } else {
        frontSim()?.setAgentCount(agentBudget(cssW));
      }
      draw();
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = (now - last) / 1000;
      last = now;
      for (const sim of sims) sim.step(dt);
      draw();
      const live = frontSim();
      if (live) {
        if (dt > 0.024) slowFrames += 1;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames > 30 && live.agents.length > 8) {
          live.setAgentCount(Math.floor(live.agents.length * 0.75));
          slowFrames = 0;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf && !disposed && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const onPointer = (e: PointerEvent) => {
      if (sims.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const inside =
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right;
      if (!inside) return;
      const vx = (e.clientX - rect.left - ox) / cover;
      const vy = (e.clientY - rect.top - oy) / cover;
      for (let i = 0; i < sims.length; i++) {
        const p = viewToLayer(vx, vy, field[i].spec);
        sims[i].addFlood(p.x, p.y);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      },
      { threshold: 0 },
    );
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 150);
    });
    let resizeTimer = 0;
    const theme = new MutationObserver(() => {
      palette = readPalette();
    });
    const onVisibility = () => (document.hidden ? undefined : start());

    // Mount after first paint so the hero text, not the canvas, decides LCP.
    const boot = () => {
      if (disposed) return;
      build();
      canvas.style.opacity = '1';
      onReady?.();
      io.observe(host);
      ro.observe(host);
      theme.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerdown', onPointer, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      start();
    };
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : null;
    const handle = idle ? idle(boot, { timeout: 1200 }) : window.setTimeout(boot, 300);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      io.disconnect();
      ro.disconnect();
      theme.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced, onReady]);

  if (reduced) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-[400ms]"
    />
  );
}
