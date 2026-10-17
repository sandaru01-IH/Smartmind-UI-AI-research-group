'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  ExternalLink as ExternalIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { SOCIAL_LABEL } from '@/lib/team/socials';
import { layoutNetwork } from '@/lib/team/layout';
import type { TeamLink, TeamMember } from '@/lib/team/types';
import { mediaUrl } from '@/lib/supabase/env';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

const PALETTE = [
  { fill: 'var(--flood)', ink: 'var(--flood-ink)' },
  { fill: 'var(--landslide)', ink: 'var(--landslide-ink)' },
  { fill: 'var(--traffic)', ink: 'var(--traffic-ink)' },
  { fill: 'var(--ai)', ink: 'var(--ai-ink)' },
  { fill: 'var(--signal)', ink: 'var(--fg)' },
] as const;
const NEUTRAL = { fill: 'var(--line-strong)', ink: 'var(--muted)' } as const;

const initials = (name: string): string => {
  const parts = name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')
  ).toUpperCase();
};

/** First and last name only, so labels stay short enough not to run into each other. */
const shortName = (name: string): string => {
  const parts = name
    .replace(/\s*\(.*?\)/, '')
    .trim()
    .split(/\s+/);
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : parts.join(' ');
};

const unit = (seed: string, i: number): number => {
  let h = 2166136261;
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 16777619);
  return (((h >>> 0) + i * 2654435761) % 1000) / 1000;
};

type Pos = Record<string, { x: number; y: number }>;

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  /** Where inside the circle the pointer grabbed, in drawing units, so the node does not jump. */
  offX: number;
  offY: number;
  moved: boolean;
}

export function TeamNetwork({
  members,
  links,
  backdrop,
}: {
  members: TeamMember[];
  links: TeamLink[];
  /** The hero's layered road network, painted on the server, shown faintly behind the canvas. */
  backdrop?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 1000, h: 620 });
  const [full, setFull] = useState(false);
  const width = box.w;
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [fullProfile, setFullProfile] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth || 1000, h: el.clientHeight || 620 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!selected && !full) return;
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || fullProfile) return; // the open profile dialog closes itself
      // First Escape closes the profile, the next leaves full screen.
      if (selected) setSelected(null);
      else setFull(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [selected, full, fullProfile]);

  // Full screen: the canvas takes the whole window so the entire team can be explored at once.
  // The browser's own full screen is used when it is there; a fixed overlay covers the rest.
  useEffect(() => {
    if (!full) return;
    const root = rootRef.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (root?.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(() => undefined);
    }
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, [full]);

  // A drawing about as wide as its box keeps nodes and text near their real size on every screen.
  const W = Math.min(full ? 2400 : 1100, Math.max(320, Math.round(width / 20) * 20));
  const narrow = W < 640;
  const H = full
    ? Math.max(360, Math.round(box.h / 10) * 10)
    : Math.round(narrow ? W * 1.8 : W * 0.6);

  const base = useMemo(
    () =>
      layoutNetwork(
        members,
        links,
        W,
        H,
        narrow ? { x: 62, top: 34, bottom: 52 } : { x: 88, top: 40, bottom: 56 },
      ),
    [members, links, W, H, narrow],
  );
  const radius = useMemo(() => new Map(base.map((p) => [p.id, p.r])), [base]);
  const baseKey = useMemo(() => `${W}x${H}:${members.map((m) => m.id).join(',')}`, [W, H, members]);

  // Positions people have been dragged to. They reset whenever the drawing is laid out afresh.
  const [dragState, setDragState] = useState<{ key: string; pos: Pos }>({ key: '', pos: {} });
  const pos: Pos = useMemo(
    () =>
      dragState.key === baseKey
        ? dragState.pos
        : Object.fromEntries(base.map((p) => [p.id, { x: p.x, y: p.y }])),
    [dragState, baseKey, base],
  );
  const posRef = useRef<Pos>(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const groups = useMemo(() => {
    const order: string[] = [];
    for (const m of members)
      if (m.group_label && !order.includes(m.group_label)) order.push(m.group_label);
    return order;
  }, [members]);
  const colourOf = useCallback(
    (m: TeamMember) => {
      const i = m.group_label ? groups.indexOf(m.group_label) : -1;
      return i < 0 ? NEUTRAL : PALETTE[i % PALETTE.length];
    },
    [groups],
  );

  const neighbours = useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    for (const l of links) {
      if (!byId.has(l.a) || !byId.has(l.b)) continue;
      map.set(l.a, [...(map.get(l.a) ?? []), { id: l.b, label: l.label }]);
      map.set(l.b, [...(map.get(l.b) ?? []), { id: l.a, label: l.label }]);
    }
    return map;
  }, [links, byId]);

  /* ------------------------------------------------------------- physics */
  const dragRef = useRef<Drag | null>(null);
  const raf = useRef(0);
  const running = useRef(false);
  const REST = narrow ? 92 : 150;

  const commit = useCallback(
    (next: Pos) => {
      posRef.current = next;
      setDragState({ key: baseKey, pos: next });
    },
    [baseKey],
  );

  // The network tugs along: friends of a dragged person follow when stretched, and nobody overlaps.
  const settle = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setMoving(true);
    const tick = () => {
      const P: Pos = Object.fromEntries(
        Object.entries(posRef.current).map(([k, v]) => [k, { ...v }]),
      );
      const held = dragRef.current?.moved ? dragRef.current.id : null;
      let energy = 0;
      const nudge = (id: string, dx: number, dy: number) => {
        if (id === held || !P[id]) return;
        const x = Math.min(W - 40, Math.max(40, P[id].x + dx));
        const y = Math.min(H - 52, Math.max(36, P[id].y + dy));
        energy += Math.abs(x - P[id].x) + Math.abs(y - P[id].y);
        P[id].x = x;
        P[id].y = y;
      };
      for (const l of links) {
        const a = P[l.a];
        const b = P[l.b];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const over = d - REST * 1.5;
        if (over > 0) {
          const k = 0.06 * over;
          const share = l.a === held || l.b === held ? 1 : 0.5;
          nudge(l.a, (dx / d) * k * share, (dy / d) * k * share);
          nudge(l.b, (-dx / d) * k * share, (-dy / d) * k * share);
        }
      }
      const ids = Object.keys(P);
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const a = P[ids[i]];
          const b = P[ids[j]];
          const min = (radius.get(ids[i]) ?? 20) + (radius.get(ids[j]) ?? 20) + 18;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d < min) {
            const push = (min - d) * 0.25;
            const aHeld = ids[i] === held;
            const bHeld = ids[j] === held;
            nudge(ids[i], (-dx / d) * push * (bHeld ? 2 : 1), (-dy / d) * push * (bHeld ? 2 : 1));
            nudge(ids[j], (dx / d) * push * (aHeld ? 2 : 1), (dy / d) * push * (aHeld ? 2 : 1));
          }
        }
      commit(P);
      if (dragRef.current || energy > 0.4) raf.current = requestAnimationFrame(tick);
      else {
        running.current = false;
        setMoving(false);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [links, radius, commit, REST, W, H]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      running.current = false;
    },
    [],
  );

  const toDrawing = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const onDown = (e: React.PointerEvent<SVGGElement>, id: string) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const at = toDrawing(e.clientX, e.clientY);
    const here = posRef.current[id];
    if (!at || !here) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offX: here.x - at.x,
      offY: here.y - at.y,
      moved: false,
    };
  };

  const onMove = (e: React.PointerEvent<SVGGElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return;
      d.moved = true;
      setDragging(d.id);
      setHover(d.id);
    }
    const at = toDrawing(e.clientX, e.clientY);
    if (!at) return;
    const r = radius.get(d.id) ?? 20;
    const x = Math.min(W - r - 6, Math.max(r + 6, at.x + d.offX));
    const y = Math.min(H - r - 22, Math.max(r + 6, at.y + d.offY));
    commit({ ...posRef.current, [d.id]: { x, y } });
    if (!reduced) settle();
  };

  const onUp = (e: React.PointerEvent<SVGGElement>, id: string) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(null);
    if (!d.moved) setSelected((cur) => (cur === id ? null : id));
    else if (!reduced) settle();
  };

  const resetLayout = () => {
    cancelAnimationFrame(raf.current);
    running.current = false;
    setMoving(false);
    setDragState({ key: '', pos: {} });
  };
  const rearranged = dragState.key === baseKey;

  /* -------------------------------------------------------------- search */
  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? members.filter((m) =>
            [m.name, m.role, m.group_label, m.affiliation].some((v) => v.toLowerCase().includes(q)),
          )
        : [],
    [q, members],
  );
  const matchIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);
  const filtering = q !== '' || groupFilter !== null;
  const isMatch = useCallback(
    (m: TeamMember) =>
      (q === '' || matchIds.has(m.id)) && (groupFilter === null || m.group_label === groupFilter),
    [q, matchIds, groupFilter],
  );

  const pick = (id: string) => {
    setListOpen(false);
    setSelected(id);
    setHover(null);
  };

  const active = hover ?? selected;
  const activeSet = useMemo(
    () => new Set(active ? [active, ...(neighbours.get(active) ?? []).map((n) => n.id)] : []),
    [active, neighbours],
  );
  const person = selected ? byId.get(selected) : null;
  const listId = `${uid}-results`;
  const linkLit = (id: string) => {
    const m = byId.get(id);
    return m ? isMatch(m) : false;
  };

  return (
    <div
      ref={rootRef}
      className={
        full
          ? 'fixed inset-0 z-[70] flex flex-col gap-3 bg-bg p-3 md:p-4'
          : `grid gap-6 lg:grid-cols-12 ${selected ? 'pb-[55svh] lg:pb-0' : ''}`
      }
    >
      <div className={full ? 'flex min-h-0 flex-1 flex-col' : 'lg:col-span-8'}>
        <div
          className={`relative isolate border border-line-strong bg-bg ${full ? 'flex min-h-0 flex-1 flex-col' : ''}`}
        >
          {/* The hero's layered roads, faint, so the page feels like one place. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden opacity-40">
            {backdrop}
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 35%, color-mix(in oklab, var(--bg) 85%, transparent) 100%)',
            }}
          />

          <div className="relative z-20 flex flex-wrap items-center gap-2 border-b border-line bg-bg/80 p-3 backdrop-blur-sm">
            <div className="relative min-w-0 flex-1 basis-56">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                role="combobox"
                aria-expanded={listOpen && matches.length > 0}
                aria-controls={listId}
                aria-label="Search the team by name"
                placeholder="Search by name"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setListOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matches[0]) pick(matches[0].id);
                  if (e.key === 'Escape') {
                    if (listOpen) setListOpen(false);
                    else setQuery('');
                  }
                }}
                className="h-11 w-full rounded-sharp border border-line-strong bg-surface pl-9 pr-3 text-base text-fg placeholder:text-muted"
              />
              {listOpen && q && matches.length > 0 ? (
                <ul
                  id={listId}
                  role="listbox"
                  aria-label="Matching people"
                  className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto border border-line-strong bg-bg shadow-[0_12px_32px_rgb(0_0_0/0.25)]"
                >
                  {matches.slice(0, 8).map((m) => (
                    <li key={m.id} role="option" aria-selected={m.id === selected}>
                      <button
                        type="button"
                        onClick={() => pick(m.id)}
                        className="flex min-h-11 w-full items-center gap-3 px-3 text-left hover:bg-surface-2"
                      >
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: colourOf(m).fill }}
                        />
                        <span className="min-w-0 flex-1 truncate">{m.name}</span>
                        {m.role ? (
                          <span className="label-mono hidden truncate text-muted sm:block">
                            {m.role}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p role="status" className="label-mono px-1 text-muted">
              {q
                ? matches.length === 0
                  ? 'No one matches'
                  : `${matches.length} found`
                : `${members.length} people`}
            </p>
            <button
              type="button"
              onClick={resetLayout}
              disabled={!rearranged}
              className="inline-flex h-11 items-center gap-2 rounded-sharp border border-line-strong px-3 text-[0.9rem] text-fg transition-opacity hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset layout
            </button>
            <button
              type="button"
              onClick={() => setFull((f) => !f)}
              aria-pressed={full}
              className="inline-flex h-11 items-center gap-2 rounded-sharp bg-signal px-4 text-[0.9rem] font-semibold text-signal-fg hover:brightness-95"
            >
              {full ? (
                <Minimize2 size={15} aria-hidden="true" />
              ) : (
                <Maximize2 size={15} aria-hidden="true" />
              )}
              {full ? 'Exit full screen' : 'Explore full screen'}
            </button>
          </div>

          <div ref={wrapRef} className={full ? 'relative min-h-0 flex-1' : 'relative'}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              style={
                full
                  ? {
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      display: 'block',
                    }
                  : { aspectRatio: `${W} / ${H}`, display: 'block' }
              }
              role="group"
              aria-label="Team network. Each circle is a person; drag a circle to move it."
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelected(null);
              }}
            >
              {links.map((l) => {
                const a = pos[l.a];
                const b = pos[l.b];
                if (!a || !b) return null;
                const on = active !== null && (l.a === active || l.b === active);
                const dim =
                  (active !== null && !on) || (filtering && !(linkLit(l.a) || linkLit(l.b)));
                return (
                  <g key={l.id} pointerEvents="none">
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={on ? 'var(--signal)' : 'var(--line-strong)'}
                      strokeWidth={on ? 1.8 : 1}
                      opacity={on ? 1 : dim ? 0.12 : 0.55}
                      className={on && !reduced ? 'team-edge-active' : undefined}
                    />
                    {!reduced && !moving && !dragging && (on || active === null) ? (
                      <circle r={on ? 3 : 2} fill="var(--signal)" opacity={on ? 1 : 0.5}>
                        <animateMotion
                          dur={`${(on ? 2.2 : 5 + unit(l.id, 1) * 5).toFixed(2)}s`}
                          begin={`${(unit(l.id, 2) * 4).toFixed(2)}s`}
                          repeatCount="indefinite"
                          path={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                        />
                      </circle>
                    ) : null}
                  </g>
                );
              })}

              {members.map((m) => {
                const p = pos[m.id];
                const r = radius.get(m.id);
                if (!p || r === undefined) return null;
                const c = colourOf(m);
                const isActive = m.id === active;
                const isSelected = m.id === selected;
                const isDragged = m.id === dragging;
                const match = isMatch(m);
                const dim = (active !== null && !activeSet.has(m.id)) || (filtering && !match);
                const photo = mediaUrl(m.photo_path);
                const count = neighbours.get(m.id)?.length ?? 0;
                // Only on hover: how this person connects to whoever is under the pointer.
                const relation =
                  hover && hover !== m.id
                    ? (neighbours.get(hover)?.find((n) => n.id === m.id)?.label ?? '')
                    : '';
                const ringOn = isActive || isSelected || (q !== '' && match);
                return (
                  <g
                    key={m.id}
                    transform={`translate(${p.x} ${p.y})`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${m.name}${m.role ? `, ${m.role}` : ''}. ${count} ${count === 1 ? 'connection' : 'connections'}. Press Enter to open, or drag to move.`}
                    className="outline-none [&:focus-visible_.ring]:stroke-[var(--focus)] [&:focus-visible_.ring]:stroke-[3]"
                    style={{
                      opacity: dim ? 0.22 : 1,
                      transition: 'opacity 200ms',
                      cursor: isDragged ? 'grabbing' : 'grab',
                      touchAction: 'none',
                    }}
                    onPointerDown={(e) => onDown(e, m.id)}
                    onPointerMove={onMove}
                    onPointerUp={(e) => onUp(e, m.id)}
                    onPointerCancel={(e) => onUp(e, m.id)}
                    onPointerEnter={(e) => e.pointerType !== 'touch' && setHover(m.id)}
                    onPointerLeave={() =>
                      setHover((h) => (h === m.id && dragRef.current?.id !== m.id ? null : h))
                    }
                    onFocus={() => setHover(m.id)}
                    onBlur={() => setHover((h) => (h === m.id ? null : h))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected((cur) => (cur === m.id ? null : m.id));
                      }
                    }}
                  >
                    <g
                      className={reduced || isDragged || moving ? undefined : 'team-float'}
                      style={
                        {
                          '--fx': `${((unit(m.id, 3) - 0.5) * 5).toFixed(1)}px`,
                          '--fy': `${((unit(m.id, 4) - 0.5) * 5).toFixed(1)}px`,
                          '--fd': `${(6 + unit(m.id, 5) * 5).toFixed(1)}s`,
                          '--fdelay': `${(-unit(m.id, 6) * 6).toFixed(1)}s`,
                        } as CSSProperties
                      }
                    >
                      <circle r={r + 12} fill="transparent" />
                      {ringOn && !reduced ? (
                        <circle
                          r={r + 4}
                          fill="none"
                          stroke="var(--signal)"
                          strokeWidth="1.5"
                          className="team-pulse"
                        />
                      ) : null}
                      <circle
                        className="ring"
                        r={r}
                        fill="var(--bg)"
                        stroke={ringOn ? 'var(--signal)' : 'var(--line-strong)'}
                        strokeWidth={isSelected ? 3 : 1.5}
                      />
                      {photo ? (
                        <>
                          <clipPath id={`${uid}-c-${m.id}`}>
                            <circle r={r - 3} />
                          </clipPath>
                          <image
                            href={photo}
                            x={-(r - 3)}
                            y={-(r - 3)}
                            width={(r - 3) * 2}
                            height={(r - 3) * 2}
                            preserveAspectRatio="xMidYMid slice"
                            clipPath={`url(#${uid}-c-${m.id})`}
                            pointerEvents="none"
                          />
                        </>
                      ) : (
                        <text
                          textAnchor="middle"
                          dy="0.35em"
                          fontSize={r > 24 ? 13 : 11.5}
                          fill="var(--fg)"
                          pointerEvents="none"
                          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
                        >
                          {initials(m.name)}
                        </text>
                      )}
                      {m.group_label ? (
                        <circle
                          cx={r * 0.72}
                          cy={-r * 0.72}
                          r={5}
                          fill={c.fill}
                          stroke="var(--bg)"
                          strokeWidth="2"
                          pointerEvents="none"
                        />
                      ) : null}
                      <text
                        y={r + 17}
                        textAnchor="middle"
                        fontSize={narrow ? 9 : 10.5}
                        fill="var(--fg)"
                        stroke="var(--bg)"
                        strokeWidth="4"
                        paintOrder="stroke"
                        pointerEvents="none"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {shortName(m.name)}
                      </text>
                      {relation ? (
                        <text
                          y={r + 30}
                          textAnchor="middle"
                          fontSize={narrow ? 8.5 : 9.5}
                          fill="var(--fg)"
                          stroke="var(--bg)"
                          strokeWidth="4"
                          paintOrder="stroke"
                          pointerEvents="none"
                          style={{
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {relation.length > 22 ? `${relation.slice(0, 21)}…` : relation}
                        </text>
                      ) : null}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${full ? 'mt-3 shrink-0' : 'mt-4'}`}
        >
          {groups.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Filter by group">
              {groups.map((g, i) => {
                const on = groupFilter === g;
                return (
                  <li key={g}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setGroupFilter(on ? null : g)}
                      className={`label-mono inline-flex min-h-9 items-center gap-2 rounded-sharp border px-3 transition-colors ${
                        on
                          ? 'border-signal bg-surface-2 text-fg'
                          : 'border-line-strong text-muted hover:text-fg'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: PALETTE[i % PALETTE.length].fill }}
                      />
                      {g}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <span />
          )}
          <p className="label-mono text-muted">
            <span className="hidden [@media(hover:hover)]:inline">
              Hover to trace links · Drag to move · Select for profile
            </span>
            <span className="[@media(hover:hover)]:hidden">Drag to move · Tap for profile</span>
          </p>
        </div>
      </div>

      <aside
        aria-label="Person details"
        aria-live="polite"
        className={
          person
            ? full
              ? 'fixed inset-x-0 bottom-0 z-[80] max-h-[55svh] overflow-y-auto border-t-2 border-signal bg-bg p-5 shadow-[0_-16px_40px_rgb(0_0_0/0.35)] md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:max-h-none md:w-[26rem] md:border md:border-line-strong md:border-t-2 md:border-t-signal md:shadow-[0_12px_40px_rgb(0_0_0/0.35)]'
              : 'fixed inset-x-0 bottom-0 z-40 max-h-[55svh] overflow-y-auto border-t-2 border-signal bg-bg p-5 shadow-[0_-16px_40px_rgb(0_0_0/0.35)] lg:static lg:z-auto lg:col-span-4 lg:max-h-none lg:border lg:border-t-2 lg:border-line-strong lg:border-t-signal lg:p-6 lg:shadow-none'
            : full
              ? 'hidden'
              : 'hidden lg:col-span-4 lg:block'
        }
      >
        {person ? (
          <Profile
            person={person}
            colour={colourOf(person)}
            onClose={() => setSelected(null)}
            onOpenFull={() => setFullProfile(true)}
          />
        ) : (
          <div className="border border-dashed border-line-strong p-6 lg:sticky lg:top-28">
            <p className="label-mono text-muted">The network</p>
            <p className="numeral mt-3 text-6xl">{members.length}</p>
            <p className="mt-2 text-muted">
              {members.length === 1 ? 'person' : 'people'}, linked by how they work together.
            </p>
            <p className="mt-5 border-t border-line pt-4 text-muted">
              Search a name, drag the circles around, and select someone to read about them.
            </p>
          </div>
        )}
      </aside>
      {person && fullProfile ? (
        <FullProfile
          person={person}
          colour={colourOf(person)}
          connections={(neighbours.get(person.id) ?? []).flatMap((n) => {
            const m = byId.get(n.id);
            return m ? [{ id: m.id, name: m.name, role: m.role, label: n.label }] : [];
          })}
          onClose={() => setFullProfile(false)}
          onOpenPerson={(id) => setSelected(id)}
        />
      ) : null}
    </div>
  );
}

const WORK_LABEL: Record<string, string> = {
  article: 'Article',
  paper: 'Paper',
  poster: 'Poster',
  report: 'Report',
  talk: 'Talk',
  other: 'Other',
  award: 'Award',
};

/** One piece of work: its year and kind, then the title as a link when there is one. */
function WorkItem({ w }: { w: TeamMember['works'][number] }) {
  return (
    <li className="text-[0.95rem] leading-snug">
      <span className="label-mono block text-muted">
        {[w.year, WORK_LABEL[w.kind]].filter(Boolean).join(' · ')}
      </span>
      {w.href && w.internal ? (
        <Link href={w.href} className="underline-offset-4 hover:underline">
          {w.title}
        </Link>
      ) : w.href ? (
        <a
          href={w.href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 hover:underline"
        >
          {w.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        w.title
      )}
    </li>
  );
}

const PREVIEW_WORKS = 4;

function Profile({
  person,
  colour,
  onClose,
  onOpenFull,
}: {
  person: TeamMember;
  colour: { fill: string; ink: string };
  onClose: () => void;
  onOpenFull: () => void;
}) {
  const photo = mediaUrl(person.photo_path);
  const rows: [string, string][] = (
    [
      ['Education', person.education],
      ['Qualifications', person.qualifications],
      ['Key contribution', person.contribution],
    ] as [string, string][]
  ).filter(([, v]) => v);
  const empty = rows.length === 0 && person.papers === null && person.works.length === 0;
  return (
    <div className="lg:sticky lg:top-28">
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong font-mono text-xl"
          style={{ boxShadow: `0 0 0 3px var(--bg), 0 0 0 5px ${colour.fill}` }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={person.photo_alt ?? ''} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials(person.name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pl-1">
          <h3 className="text-2xl">{person.name}</h3>
          {person.role ? <p className="mt-1">{person.role}</p> : null}
          {person.group_label ? (
            <p className="label-mono mt-2 flex items-center gap-2" style={{ color: colour.ink }}>
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: colour.fill }}
              />
              {person.group_label}
            </p>
          ) : null}
          {person.affiliation ? <p className="mt-1 text-muted">{person.affiliation}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp text-muted hover:text-fg"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenFull}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sharp border border-line-strong text-[0.95rem] font-semibold text-fg hover:bg-surface-2"
      >
        <Maximize2 size={15} aria-hidden="true" />
        View full profile
      </button>

      {person.papers !== null ? (
        <p className="mt-6 flex items-baseline gap-3 border-t border-line pt-5">
          <span className="numeral text-5xl">{person.papers}</span>
          <span className="label-mono text-muted">{person.papers === 1 ? 'paper' : 'papers'}</span>
        </p>
      ) : null}

      {rows.length > 0 ? (
        <dl className="mt-6 space-y-5 border-t border-line pt-5">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="label-mono text-muted">{k}</dt>
              <dd className="mt-1.5 whitespace-pre-line">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {person.works.length > 0 ? (
        <div className="mt-6 border-t border-line pt-5">
          <h4 className="label-mono text-muted">Work · {person.works.length}</h4>
          <ul className="mt-3 space-y-3">
            {person.works.slice(0, PREVIEW_WORKS).map((w) => (
              <WorkItem key={w.key} w={w} />
            ))}
          </ul>
          {person.works.length > PREVIEW_WORKS ? (
            <p className="label-mono mt-3 text-muted">
              + {person.works.length - PREVIEW_WORKS} more in the full profile
            </p>
          ) : null}
        </div>
      ) : null}
      {empty ? (
        <p className="mt-6 border-t border-line pt-5 text-muted">
          More about {person.name.split(' ')[0]} is coming soon.
        </p>
      ) : null}

      {person.socials.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${person.name} on the web`}>
          {person.socials.map((s) => (
            <li key={`${s.platform}-${s.url}`}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="label-mono inline-flex min-h-9 items-center gap-1.5 rounded-sharp border border-line-strong px-3 text-fg hover:bg-surface-2"
              >
                {SOCIAL_LABEL[s.platform]}
                <ExternalIcon size={12} aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {person.profile_url ? (
        <p className="mt-4">
          <a
            href={person.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4"
          >
            Profile <ExternalIcon size={14} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      ) : null}
    </div>
  );
}

/**
 * The whole profile on one clean page, in a dialog over the network. It opens from the side panel, shows
 * everything known about the person in reading order, and the people they work with open in place.
 */
function FullProfile({
  person,
  colour,
  connections,
  onClose,
  onOpenPerson,
}: {
  person: TeamMember;
  colour: { fill: string; ink: string };
  connections: { id: string; name: string; role: string; label: string }[];
  onClose: () => void;
  onOpenPerson: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const photo = mediaUrl(person.photo_path);

  useEffect(() => {
    // Unmounting removes the dialog (and its backdrop) by itself; closing it here would fire the
    // close handler during React's development double-run and shut the dialog the moment it opens.
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [person.id]);

  // Work grouped by year, newest first.
  const byYear = useMemo(() => {
    const groups = new Map<string, TeamMember['works']>();
    for (const w of person.works) {
      const key = w.year ? String(w.year) : 'Undated';
      groups.set(key, [...(groups.get(key) ?? []), w]);
    }
    return [...groups.entries()];
  }, [person.works]);

  const facts: [string, string][] = (
    [
      ['Education', person.education],
      ['Qualifications', person.qualifications],
      ['Key contribution', person.contribution],
    ] as [string, string][]
  ).filter(([, v]) => v);
  const papers = person.works.filter((w) => w.kind === 'paper').length;
  const awards = person.works.filter((w) => w.kind === 'award').length;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto h-[min(54rem,94svh)] w-[min(52rem,96vw)] overflow-y-auto border border-line-strong bg-bg p-0 text-fg backdrop:bg-black/40 backdrop:backdrop-blur-md"
    >
      <header
        className="sticky top-0 z-10 flex items-start gap-4 border-b border-line bg-bg/95 p-5 backdrop-blur-sm md:p-7"
        style={{ borderTop: `3px solid ${colour.fill}` }}
      >
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong font-mono text-2xl"
          style={{ boxShadow: `0 0 0 3px var(--bg), 0 0 0 5px ${colour.fill}` }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={person.photo_alt ?? ''} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials(person.name)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pl-1">
          <h2 id={titleId} className="text-2xl md:text-4xl">
            {person.name}
          </h2>
          {person.role ? <p className="mt-1 text-lg">{person.role}</p> : null}
          <p className="label-mono mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {person.group_label ? (
              <span className="inline-flex items-center gap-2" style={{ color: colour.ink }}>
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ background: colour.fill }}
                />
                {person.group_label}
              </span>
            ) : null}
            {person.affiliation ? <span className="text-muted">{person.affiliation}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close full profile"
          className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp text-muted hover:text-fg"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>

      <div className="space-y-10 p-5 md:p-7">
        <dl className="grid grid-cols-3 gap-px border border-line bg-line text-center">
          {(
            [
              ['Work', person.works.length],
              ['Papers', person.papers ?? papers],
              ['Connections', connections.length],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="bg-bg p-4">
              <dd className="numeral text-3xl md:text-4xl">{n}</dd>
              <dt className="label-mono mt-1 text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        {awards > 0 ? (
          <p className="label-mono -mt-6 text-muted">
            Includes {awards} {awards === 1 ? 'award' : 'awards'}.
          </p>
        ) : null}

        {facts.length > 0 ? (
          <section aria-label="About">
            <dl className="space-y-6">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="label-mono text-muted">{k}</dt>
                  <dd className="mt-2 max-w-[62ch] whitespace-pre-line text-lg">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {person.socials.length > 0 || person.profile_url ? (
          <section aria-label="Find them online">
            <h3 className="label-mono text-muted">Online</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {person.socials.map((so) => (
                <li key={`${so.platform}-${so.url}`}>
                  <a
                    href={so.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono inline-flex min-h-10 items-center gap-1.5 rounded-sharp border border-line-strong px-3 text-fg hover:bg-surface-2"
                  >
                    {SOCIAL_LABEL[so.platform]}
                    <ExternalIcon size={12} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
              {person.profile_url ? (
                <li>
                  <a
                    href={person.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono inline-flex min-h-10 items-center gap-1.5 rounded-sharp border border-line-strong px-3 text-fg hover:bg-surface-2"
                  >
                    Profile
                    <ExternalIcon size={12} aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <section aria-label="Work">
          <h3 className="label-mono text-muted">Work · {person.works.length}</h3>
          {byYear.length === 0 ? (
            <p className="mt-3 text-muted">Nothing is linked to this person yet.</p>
          ) : (
            <div className="mt-4 space-y-7">
              {byYear.map(([year, list]) => (
                <div key={year} className="grid gap-3 md:grid-cols-[5rem_1fr]">
                  <p className="numeral text-2xl text-muted">{year}</p>
                  <ul className="space-y-4 border-l border-line pl-5">
                    {list.map((w) => (
                      <WorkItem key={w.key} w={w} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {connections.length > 0 ? (
          <section aria-label="Connections">
            <h3 className="label-mono text-muted">Works with · {connections.length}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {connections.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onOpenPerson(c.id)}
                    className="block min-h-11 w-full border border-line px-3 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="block">{c.name}</span>
                    {c.label || c.role ? (
                      <span className="label-mono block truncate text-muted">
                        {c.label || c.role}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </dialog>
  );
}
