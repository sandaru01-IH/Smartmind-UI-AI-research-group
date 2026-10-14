'use client';

import { useEffect, useRef, useState } from 'react';
import { betweenness } from '@/lib/sim/centrality';
import { generateGraph } from '@/lib/sim/graph';
import { HERO_SEED } from '@/lib/sim/static-network';
import { RoadSim } from '@/lib/sim/sim';

interface Palette {
  road: string;
  node: string;
  agent: string;
  agentEdge: string;
  flood: string;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string) => css.getPropertyValue(name).trim();
  const light = document.documentElement.dataset.theme === 'light';
  return {
    road: get('--line-strong'),
    node: get('--muted'),
    agent: light ? get('--fg') : get('--signal'),
    agentEdge: light ? get('--signal') : get('--bg'),
    flood: light ? get('--flood-ink') : get('--flood'),
  };
}

/** Agent cap by device. Reduced further at run time if frames run long. */
function agentBudget(width: number): number {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) return 80;
  if (width < 768) return cores >= 8 ? 200 : 140;
  return cores >= 8 ? 420 : 260;
}

/**
 * Live road-network simulation. Mounts after first paint, pauses when off-screen or hidden,
 * and does nothing under reduced motion (the static SVG stays).
 */
export function HeroCanvas({ onReady }: { onReady?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

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
    let sim: RoadSim | null = null;
    let centrality: number[] = [];
    let palette = readPalette();
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let scale = 1; // px per world unit
    let worldW = 160;
    let lastAspect = 0;
    let layer: HTMLCanvasElement | null = null;
    let budget = 0;
    let slowFrames = 0;
    let last = performance.now();

    const drawStatic = () => {
      if (!sim) return;
      layer = document.createElement('canvas');
      layer.width = Math.round(cssW * dpr);
      layer.height = Math.round(cssH * dpr);
      const l = layer.getContext('2d');
      if (!l) return;
      l.scale(dpr, dpr);
      const g = sim.graph;
      l.lineCap = 'round';
      l.strokeStyle = palette.road;
      l.globalAlpha = 0.55;
      l.lineWidth = Math.max(0.8, scale * 0.22);
      l.beginPath();
      for (const e of g.edges) {
        l.moveTo(g.nodes[e.a].x * scale, g.nodes[e.a].y * scale);
        l.lineTo(g.nodes[e.b].x * scale, g.nodes[e.b].y * scale);
      }
      l.stroke();
      l.globalAlpha = 0.85;
      l.fillStyle = palette.node;
      g.nodes.forEach((n, i) => {
        l.beginPath();
        l.arc(n.x * scale, n.y * scale, scale * (0.35 + 1.5 * Math.pow(centrality[i], 0.6)), 0, Math.PI * 2);
        l.fill();
      });
    };

    const build = () => {
      const rect = host.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      scale = cssH / 100;
      const aspect = cssW / cssH;
      // Regenerate only when the shape changes a lot. Otherwise reuse the same network.
      if (!sim || Math.abs(aspect - lastAspect) / lastAspect > 0.18) {
        lastAspect = aspect;
        worldW = 100 * aspect;
        const graph = generateGraph({
          seed: HERO_SEED,
          nodeTarget: cssW < 768 ? 150 : 200,
          width: worldW,
          height: 100,
        });
        centrality = betweenness(graph, { samples: 40, seed: HERO_SEED });
        budget = agentBudget(cssW);
        sim = new RoadSim({ graph, agentCount: budget, seed: HERO_SEED, centrality });
      }
      palette = readPalette();
      drawStatic();
    };

    const draw = () => {
      if (!sim || !layer) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(layer, 0, 0);
      ctx.scale(dpr, dpr);
      const g = sim.graph;

      // Flooded roads
      ctx.lineCap = 'round';
      ctx.strokeStyle = palette.flood;
      ctx.lineWidth = Math.max(1.4, scale * 0.5);
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      for (let i = 0; i < g.edges.length; i++) {
        if (!sim.blocked[i]) continue;
        const e = g.edges[i];
        ctx.moveTo(g.nodes[e.a].x * scale, g.nodes[e.a].y * scale);
        ctx.lineTo(g.nodes[e.b].x * scale, g.nodes[e.b].y * scale);
      }
      ctx.stroke();

      // Ripples
      for (const f of sim.floods) {
        const r = sim.floodRadiusAt(f) * scale;
        if (r < 1) continue;
        const life = 1 - f.age / 3.2;
        ctx.globalAlpha = 0.18 * life;
        ctx.fillStyle = palette.flood;
        ctx.beginPath();
        ctx.arc(f.x * scale, f.y * scale, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5 * life;
        ctx.strokeStyle = palette.flood;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Agents
      ctx.globalAlpha = 1;
      const rad = Math.max(1.5, scale * 0.42);
      ctx.fillStyle = palette.agent;
      ctx.strokeStyle = palette.agentEdge;
      ctx.lineWidth = 0.75;
      for (const a of sim.agents) {
        const from = g.nodes[a.from];
        const to = g.nodes[a.to];
        const x = (from.x + (to.x - from.x) * a.t) * scale;
        const y = (from.y + (to.y - from.y) * a.t) * scale;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = (now - last) / 1000;
      last = now;
      if (sim) {
        sim.step(dt);
        draw();
        // Shed agents if the device cannot hold the frame rate.
        if (dt > 0.024) slowFrames += 1;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames > 30 && sim.agents.length > 40) {
          sim.setAgentCount(Math.floor(sim.agents.length * 0.75));
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

    const toWorld = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale, inside: clientY >= r.top && clientY <= r.bottom && clientX >= r.left && clientX <= r.right };
    };
    const onPointer = (e: PointerEvent) => {
      if (!sim) return;
      const p = toWorld(e.clientX, e.clientY);
      if (p.inside) sim.addFlood(p.x, p.y);
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
      drawStatic();
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
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('pointerdown', onPointer, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      start();
    };
    const idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback.bind(window) : null;
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
