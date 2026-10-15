import type { CSSProperties } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { CONTACT_EMAIL } from '@/content/brand';

const SUBJECT = encodeURIComponent('Hello Smartmind');
const PHRASES = ['Spark your idea', 'Research', 'Project with the support of Smartmind'];

const ROADS = [
  'M-20 300 C 200 250, 340 330, 560 270 S 900 200, 1240 250',
  'M-20 120 C 180 160, 380 80, 600 130 S 960 190, 1240 110',
  'M300 -20 C 330 120, 280 240, 360 420',
  'M860 -20 C 820 110, 900 230, 840 420',
];
const BLOCKS: [number, number, number, number][] = [
  [70, 320, 70, 36],
  [160, 340, 44, 28],
  [90, 370, 56, 22],
  [250, 36, 60, 34],
  [330, 70, 38, 26],
];
const AI_NODES: [number, number][] = [
  [960, 70],
  [1040, 130],
  [1120, 60],
  [1100, 190],
  [980, 200],
];

/**
 * The closing call to action: one big link that opens an email to the team. The artwork behind it
 * draws the four research themes (land blocks, flood rings, moving traffic, a small AI network).
 * It is decorative, so it is hidden from assistive technology and everything moves with CSS only.
 */
export function ContactBeacon({ headingLevel: H = 'h2' }: { headingLevel?: 'h2' | 'h3' }) {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}?subject=${SUBJECT}`}
      className="group relative isolate block overflow-hidden border border-line-strong bg-surface transition-colors duration-300 hover:border-signal"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 h-full w-full opacity-90 transition-opacity duration-500"
      >
        {ROADS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth="1.5"
            className="beacon-road"
          />
        ))}
        {BLOCKS.map(([x, y, w, h]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={w}
            height={h}
            fill="none"
            stroke="var(--landslide)"
            strokeWidth="1.5"
            opacity="0.7"
          />
        ))}
        {[0, 1.6, 3.2].map((delay) => (
          <circle
            key={delay}
            cx="760"
            cy="300"
            r="130"
            fill="none"
            stroke="var(--flood)"
            strokeWidth="2"
            className="beacon-ring"
            style={{ '--bd': `${delay}s` } as CSSProperties}
          />
        ))}
        {[0, 2.4, 4.8].map((delay, i) => (
          <circle
            key={delay}
            r="5"
            fill="var(--traffic)"
            className="beacon-car"
            style={
              {
                '--bd': `${-delay}s`,
                '--bt': `${7 + i}s`,
                offsetPath: `path("${ROADS[i % 2]}")`,
              } as CSSProperties
            }
          />
        ))}
        {AI_NODES.map(([x, y], i) => (
          <g key={`${x}-${y}`}>
            {AI_NODES.slice(i + 1).map(([x2, y2]) => (
              <line
                key={`${x2}-${y2}`}
                x1={x}
                y1={y}
                x2={x2}
                y2={y2}
                stroke="var(--ai)"
                strokeWidth="1"
                opacity="0.45"
              />
            ))}
            <circle
              cx={x}
              cy={y}
              r="6"
              fill="var(--ai)"
              className="beacon-node"
              style={{ '--bd': `${i * 0.5}s` } as CSSProperties}
            />
          </g>
        ))}
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to right, color-mix(in oklab, var(--surface) 92%, transparent) 0%, color-mix(in oklab, var(--surface) 55%, transparent) 50%, transparent 100%)',
        }}
      />

      <div className="grid gap-10 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-end md:p-14">
        <div>
          <p className="label-mono text-muted">Get in touch</p>
          <H className="mt-4 text-5xl sm:text-6xl md:text-7xl">Contact us</H>
          <ul className="mt-8 flex flex-wrap gap-2">
            {PHRASES.map((p) => (
              <li
                key={p}
                className="rounded-sharp border border-line-strong bg-bg/70 px-3 py-2 text-[0.95rem]"
              >
                {p}
              </li>
            ))}
          </ul>
          <p className="label-mono mt-8 flex flex-wrap items-center gap-2 text-fg">
            <Mail size={16} aria-hidden="true" />
            {CONTACT_EMAIL}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-signal text-signal-fg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 md:h-28 md:w-28"
        >
          <ArrowUpRight size={40} />
        </span>
      </div>
      <span className="sr-only">Opens an email to the Smartmind team</span>
    </a>
  );
}
