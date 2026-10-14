import { createRng } from '@/lib/sim/rng';
import type { ThemeId } from '@/content/types';

const W = 200;
const H = 120;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A small generative pattern for each research theme. Deterministic, decorative, theme-coloured. */
export function ThemePattern({
  theme,
  colour,
  className = '',
}: {
  theme: ThemeId;
  colour: string;
  className?: string;
}) {
  const rng = createRng({ land: 11, flood: 23, traffic: 37, ai: 53 }[theme]);
  let body: React.ReactNode;

  if (theme === 'land') {
    // Population grid: cell opacity follows a noisy density surface. Cells with the same opacity
    // step share one path, so 240 cells become six short paths.
    const cols = 20;
    const rows = 12;
    const buckets = new Map<number, string>();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const d = Math.max(0, 1 - Math.hypot(x - 13, y - 5) / 9) + rng() * 0.25;
        const opacity = Math.round((Math.min(0.95, d) * 0.9 + 0.04) * 6) / 6;
        buckets.set(opacity, `${buckets.get(opacity) ?? ''}M${x * 10 + 1} ${y * 10 + 1}h8v8h-8z`);
      }
    }
    body = Array.from(buckets, ([opacity, d]) => (
      <path key={opacity} d={d} fill={colour} opacity={r1(opacity)} />
    ));
  } else if (theme === 'flood') {
    // Contour lines of rising water.
    const lines = [];
    for (let i = 0; i < 9; i++) {
      const y = 12 + i * 12;
      const amp = 3 + rng() * 5;
      const phase = rng() * Math.PI * 2;
      let d = '';
      for (let x = 0; x <= W; x += 8)
        d += `${x === 0 ? 'M' : 'L'}${x} ${r1(y + Math.sin(x / 22 + phase + i * 0.6) * amp)}`;
      lines.push(
        <path
          key={i}
          d={d}
          fill="none"
          stroke={colour}
          strokeWidth="1.2"
          opacity={r1(0.25 + (i / 9) * 0.7)}
        />,
      );
    }
    body = lines;
  } else if (theme === 'traffic') {
    // Lanes with moving-looking dashes and one junction.
    const lanes = [];
    for (let i = 0; i < 7; i++) {
      const y = 14 + i * 15;
      const dash = `${4 + Math.floor(rng() * 10)} ${6 + Math.floor(rng() * 10)}`;
      lanes.push(
        <line
          key={i}
          x1="0"
          y1={y}
          x2={W}
          y2={y + (i % 2 ? 6 : -6)}
          stroke={colour}
          strokeWidth={i === 3 ? 2.4 : 1.2}
          strokeDasharray={dash}
          opacity={i === 3 ? 1 : 0.55}
        />,
      );
    }
    body = (
      <>
        {lanes}
        <circle cx="120" cy="60" r="6" fill={colour} />
        <circle cx="120" cy="60" r="14" fill="none" stroke={colour} opacity="0.5" />
      </>
    );
  } else {
    // Layered network, like a small neural net.
    const layers = [4, 6, 6, 3];
    const pts = layers.map((n, li) =>
      Array.from({ length: n }, (_, k) => ({
        x: 20 + li * 53,
        y: ((k + 1) * H) / (n + 1) + (rng() - 0.5) * 6,
      })),
    );
    const links = [];
    for (let li = 0; li < pts.length - 1; li++) {
      for (const a of pts[li])
        for (const b of pts[li + 1]) {
          if (rng() < 0.55)
            links.push(
              <line
                key={`${li}-${links.length}`}
                x1={r1(a.x)}
                y1={r1(a.y)}
                x2={r1(b.x)}
                y2={r1(b.y)}
                stroke={colour}
                strokeWidth="0.8"
                opacity="0.4"
              />,
            );
        }
    }
    body = (
      <>
        {links}
        {pts.flat().map((p, i) => (
          <circle key={i} cx={r1(p.x)} cy={r1(p.y)} r="3.2" fill={colour} />
        ))}
      </>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      {body}
    </svg>
  );
}
