import { betweenness } from './centrality';
import { generateGraph } from './graph';

export const HERO_SEED = 2026;
export const FALLBACK_SIZE = { width: 160, height: 100 } as const;

export interface StaticNetwork {
  /** One path for all roads, to keep the markup small. */
  roads: string;
  nodes: { x: number; y: number; r: number }[];
}

const round = (n: number) => Math.round(n * 10) / 10;
let cached: StaticNetwork | null = null;

/** Deterministic network used for the static SVG fallback. Same generator as the live canvas. */
export function staticNetwork(): StaticNetwork {
  if (cached) return cached;
  const g = generateGraph({ seed: HERO_SEED, nodeTarget: 170, ...FALLBACK_SIZE });
  const c = betweenness(g, { samples: 40, seed: HERO_SEED });
  cached = {
    roads: g.edges
      .map(
        (e) =>
          `M${round(g.nodes[e.a].x)} ${round(g.nodes[e.a].y)}L${round(g.nodes[e.b].x)} ${round(g.nodes[e.b].y)}`,
      )
      .join(''),
    nodes: g.nodes.map((n, i) => ({
      x: round(n.x),
      y: round(n.y),
      r: round(0.35 + 1.5 * Math.pow(c[i], 0.6)),
    })),
  };
  return cached;
}
