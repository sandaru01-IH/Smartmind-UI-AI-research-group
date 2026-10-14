import { betweenness } from './centrality';
import { generateGraph, type Graph } from './graph';

export const HERO_SEED = 2026;
export const FALLBACK_SIZE = { width: 160, height: 100 } as const;
export const WORLD_CX = FALLBACK_SIZE.width / 2;
export const WORLD_CY = FALLBACK_SIZE.height / 2;

/**
 * Sheets of one city, far to near. Opacity is the depth cue: each sheet behind the front is
 * fainter. Scale and shift keep the sheets from sitting on exactly the same roads. Pointing
 * at the hero lights the nearest road on every sheet.
 */
export interface DepthLayerSpec {
  id: string;
  seed: number;
  nodeTarget: number;
  scale: number;
  dx: number;
  dy: number;
  /** Road stroke opacity. */
  road: number;
  /** Junction opacity. */
  node: number;
  /** The sheet that carries agents and is the pointer's main target. */
  live: boolean;
}

export const DEPTH_LAYERS: readonly DepthLayerSpec[] = [
  {
    id: 'far',
    seed: 2014,
    nodeTarget: 52,
    scale: 1.42,
    dx: -12,
    dy: 7,
    road: 0.16,
    node: 0.22,
    live: false,
  },
  {
    id: 'mid',
    seed: 2019,
    nodeTarget: 78,
    scale: 1.2,
    dx: 9,
    dy: -6,
    road: 0.24,
    node: 0.32,
    live: false,
  },
  {
    id: 'close',
    seed: 2023,
    nodeTarget: 108,
    scale: 1.07,
    dx: -4,
    dy: 2.4,
    road: 0.32,
    node: 0.42,
    live: false,
  },
  {
    id: 'front',
    seed: HERO_SEED,
    nodeTarget: 150,
    scale: 1,
    dx: 0,
    dy: 0,
    road: 0.46,
    node: 0.6,
    live: true,
  },
];

export interface DepthField {
  spec: DepthLayerSpec;
  graph: Graph;
  centrality: number[];
}

let cached: DepthField[] | null = null;

/** Deterministic sheets shared by the static SVG and the live canvas, so they occupy the same roads. */
export function depthField(): DepthField[] {
  if (cached) return cached;
  cached = DEPTH_LAYERS.map((spec) => {
    const graph = generateGraph({ seed: spec.seed, nodeTarget: spec.nodeTarget, ...FALLBACK_SIZE });
    const centrality = betweenness(graph, { samples: spec.live ? 40 : 16, seed: spec.seed });
    return { spec, graph, centrality };
  });
  return cached;
}

/** Cover-fit of the 160×100 city into a viewport, matching `preserveAspectRatio="xMidYMid slice"`. */
export function coverFrame(cssW: number, cssH: number) {
  const scale = Math.max(cssW / FALLBACK_SIZE.width, cssH / FALLBACK_SIZE.height);
  return {
    scale,
    ox: (cssW - FALLBACK_SIZE.width * scale) / 2,
    oy: (cssH - FALLBACK_SIZE.height * scale) / 2,
  };
}

/** A point on one sheet, in viewBox units. */
export function layerToView(x: number, y: number, spec: DepthLayerSpec) {
  return {
    x: WORLD_CX + (x - WORLD_CX) * spec.scale + spec.dx,
    y: WORLD_CY + (y - WORLD_CY) * spec.scale + spec.dy,
  };
}

/** Inverse of `layerToView`. */
export function viewToLayer(vx: number, vy: number, spec: DepthLayerSpec) {
  return {
    x: WORLD_CX + (vx - WORLD_CX - spec.dx) / spec.scale,
    y: WORLD_CY + (vy - WORLD_CY - spec.dy) / spec.scale,
  };
}

/** SVG group transform equivalent to `layerToView`. */
export function layerTransform(spec: DepthLayerSpec) {
  return `translate(${WORLD_CX + spec.dx} ${WORLD_CY + spec.dy}) scale(${spec.scale}) translate(${-WORLD_CX} ${-WORLD_CY})`;
}
