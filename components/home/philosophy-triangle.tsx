'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IDENTITY, ORS, PILLARS } from '@/content/philosophy';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

type Key = (typeof ORS)[number]['key'];

const W = 600;
const H = 520;
/** Open at the top, Reproducible and Simple along the base. */
const POINTS: Record<Key, { x: number; y: number }> = {
  open: { x: 300, y: 80 },
  reproducible: { x: 100, y: 420 },
  simple: { x: 500, y: 420 },
};
const KEYS: Key[] = ['open', 'reproducible', 'simple'];
const CENTRE = { x: 300, y: 310 };

const OUTLINE = `M${POINTS.open.x} ${POINTS.open.y} L${POINTS.simple.x} ${POINTS.simple.y} L${POINTS.reproducible.x} ${POINTS.reproducible.y} Z`;

/**
 * The ORS mindset as a triangle: Open, Reproducible and Simple at the three corners, with
 * Intelligence + Love at the centre. The outline draws itself when it scrolls into view, one quiet
 * point travels round it, and the corners take turns to come forward with their meaning. The
 * buttons let a visitor choose a corner; after that the turns stop. Under reduced motion the
 * drawing is complete and still.
 */
export function PhilosophyTriangle() {
  const reduced = usePrefersReducedMotion();
  const root = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  const [active, setActive] = useState<Key>('open');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || touched || !seen) return;
    const id = window.setInterval(
      () => setActive((cur) => KEYS[(KEYS.indexOf(cur) + 1) % KEYS.length]),
      6000,
    );
    return () => window.clearInterval(id);
  }, [reduced, touched, seen]);

  const choose = (k: Key) => {
    setTouched(true);
    setActive(k);
  };
  const step = (by: 1 | -1) => {
    setTouched(true);
    setActive((cur) => KEYS[(KEYS.indexOf(cur) + by + KEYS.length) % KEYS.length]);
  };

  const drawn = seen || reduced;
  const current = ORS.find((o) => o.key === active)!;

  return (
    <div ref={root} className="tri-diagram">
      <div className="grid-12 items-center gap-y-12">
        <div className="col-span-12 md:col-span-7">
          <div
            className="relative mx-auto w-full max-w-[600px]"
            style={{ aspectRatio: `${W} / ${H}` }}
            data-drawn={drawn}
          >
            <svg
              aria-hidden="true"
              viewBox={`0 0 ${W} ${H}`}
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              <path
                d={OUTLINE}
                pathLength={1}
                fill="none"
                stroke="var(--tri-edge)"
                strokeWidth="1"
                strokeLinejoin="round"
                className="tri-edge"
              />

              {/* a hairline from the centre to the corner in view */}
              {KEYS.map((k) => (
                <line
                  key={k}
                  x1={CENTRE.x}
                  y1={CENTRE.y}
                  x2={POINTS[k].x}
                  y2={POINTS[k].y}
                  stroke="var(--tri-core)"
                  strokeWidth="1"
                  style={{ opacity: active === k ? 0.55 : 0, transition: 'opacity 500ms' }}
                />
              ))}

              {/* one quiet point travelling round the outline */}
              {drawn && !reduced ? (
                <circle r="3" fill="var(--tri-core)">
                  <animateMotion dur="18s" repeatCount="indefinite" path={OUTLINE} />
                </circle>
              ) : null}

              <g className={drawn && !reduced ? 'tri-core' : undefined}>
                <circle
                  cx={CENTRE.x}
                  cy={CENTRE.y}
                  r="64"
                  fill="var(--bg)"
                  stroke="var(--tri-core)"
                  strokeWidth="1"
                />
              </g>
              <text
                x={CENTRE.x}
                y={CENTRE.y - 4}
                textAnchor="middle"
                fill="var(--fg)"
                fontSize="17"
                fontFamily="var(--font-display)"
              >
                Intelligence
              </text>
              <text
                x={CENTRE.x}
                y={CENTRE.y + 18}
                textAnchor="middle"
                fill="var(--fg)"
                fontSize="17"
                fontFamily="var(--font-display)"
              >
                + Love
              </text>

              {KEYS.map((k) => (
                <circle
                  key={`dot-${k}`}
                  cx={POINTS[k].x}
                  cy={POINTS[k].y}
                  r={active === k ? 7 : 4}
                  fill={active === k ? 'var(--tri-core)' : 'var(--bg)'}
                  stroke={active === k ? 'var(--tri-core)' : 'var(--tri-edge)'}
                  strokeWidth="1"
                  style={{ transition: 'r 400ms' }}
                />
              ))}
            </svg>

            {ORS.map((o, i) => {
              const p = POINTS[o.key];
              const on = active === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(o.key)}
                  onMouseEnter={() => choose(o.key)}
                  onFocus={() => choose(o.key)}
                  className="absolute flex min-h-11 w-36 flex-col items-center gap-1 rounded-sharp px-2 py-2 text-center"
                  style={
                    {
                      left: `${(p.x / W) * 100}%`,
                      top: `${(p.y / H) * 100}%`,
                      transform: o.key === 'open' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                      marginTop: o.key === 'open' ? '-0.9rem' : '0.9rem',
                    } as CSSProperties
                  }
                >
                  <span className="numeral text-[0.8rem] text-muted">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    style={{ fontSize: '1.375rem', lineHeight: 1.1 }}
                    className={`font-display tracking-tight transition-colors ${
                      on ? 'text-fg' : 'text-muted'
                    }`}
                  >
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 md:col-span-5">
          <div className="mb-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Show the previous idea"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp border border-line-strong hover:bg-surface-2"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <div role="group" aria-label="Choose an idea" className="flex flex-1 gap-2">
              {ORS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={active === o.key}
                  onClick={() => choose(o.key)}
                  className={`min-h-11 flex-1 rounded-sharp border px-2 text-[0.85rem] font-semibold transition-colors ${
                    active === o.key
                      ? 'border-fg bg-fg text-bg'
                      : 'border-line-strong text-fg hover:bg-surface-2'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Show the next idea"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp border border-line-strong hover:bg-surface-2"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div aria-live="polite" key={active} className="tri-copy">
            <p className="label-mono text-muted">
              The ORS mindset · {String(ORS.indexOf(current) + 1).padStart(2, '0')} / 03
            </p>
            <h3 className="mt-4 text-5xl tracking-tight md:text-6xl">{current.label}</h3>
            <p className="mt-6 max-w-[40ch] text-lg text-muted">{current.body}</p>
          </div>
        </div>
      </div>

      <dl className="mt-16 grid border-t border-line md:mt-24 md:grid-cols-3">
        {Object.values(PILLARS).map((p) => (
          <div key={p.key} className="border-b border-line py-6 md:border-b-0 md:pr-8">
            <dt className="label-mono text-muted">{p.label}</dt>
            <dd className="mt-3 font-display text-lg leading-snug md:text-xl">{p.headline}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 max-w-[58ch] text-muted">{IDENTITY.mindset}</p>
    </div>
  );
}
