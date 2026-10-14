import { generateGraph } from '@/lib/sim/graph';
import { createRng } from '@/lib/sim/rng';
import type { Category } from '@/lib/schemas';

const CATEGORY_COLOUR: Record<Category, string> = {
  News: 'var(--signal)',
  Event: 'var(--ai)',
  Research: 'var(--landslide)',
  Chatbot: 'var(--flood)',
  Award: 'var(--landslide)',
  Publication: 'var(--ai)',
  Partnership: 'var(--traffic)',
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generated placeholder cover: a small road network seeded by the post slug, with one flooded
 * stretch in the category colour. Decorative, so it carries no alt text. Replace with a real photo
 * by uploading a cover image on the post.
 */
export function CoverArt({
  seed,
  category,
  className = '',
}: {
  seed: string;
  category: Category;
  className?: string;
}) {
  const h = hash(seed);
  const g = generateGraph({ seed: h, nodeTarget: 46, width: 160, height: 90 });
  const rng = createRng(h ^ 0x9e3779b9);
  const colour = CATEGORY_COLOUR[category];
  const hot = new Set<number>();
  const start = Math.floor(rng() * g.edges.length);
  hot.add(start);
  const origin = g.nodes[g.edges[start].a];
  g.edges.forEach((e, i) => {
    const m = { x: (g.nodes[e.a].x + g.nodes[e.b].x) / 2, y: (g.nodes[e.a].y + g.nodes[e.b].y) / 2 };
    if (Math.hypot(m.x - origin.x, m.y - origin.y) < 22) hot.add(i);
  });
  const r = (n: number) => Math.round(n * 10) / 10;
  const plain = g.edges
    .filter((_, i) => !hot.has(i))
    .map((e) => `M${r(g.nodes[e.a].x)} ${r(g.nodes[e.a].y)}L${r(g.nodes[e.b].x)} ${r(g.nodes[e.b].y)}`)
    .join('');
  const flooded = g.edges
    .filter((_, i) => hot.has(i))
    .map((e) => `M${r(g.nodes[e.a].x)} ${r(g.nodes[e.a].y)}L${r(g.nodes[e.b].x)} ${r(g.nodes[e.b].y)}`)
    .join('');
  return (
    <svg
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`h-full w-full bg-surface-2 ${className}`}
    >
      <path d={plain} fill="none" stroke="var(--line-strong)" strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />
      <path d={flooded} fill="none" stroke={colour} strokeWidth="1.1" strokeLinecap="round" />
      <g fill="var(--muted)" opacity="0.8">
        {g.nodes.map((n, i) => (
          <circle key={i} cx={r(n.x)} cy={r(n.y)} r="0.9" />
        ))}
      </g>
      <circle cx={r(origin.x)} cy={r(origin.y)} r="2.4" fill={colour} />
    </svg>
  );
}
