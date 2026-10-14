import { createRng } from './rng';

export interface Pt {
  x: number;
  y: number;
}
export interface Edge {
  a: number;
  b: number;
  len: number;
}
export interface Graph {
  nodes: Pt[];
  edges: Edge[];
  /** adj[node] = list of { neighbour, edge index }. */
  adj: { to: number; edge: number }[][];
  width: number;
  height: number;
}

interface Tri {
  a: number;
  b: number;
  c: number;
  cx: number;
  cy: number;
  r2: number;
}

function makeTri(pts: Pt[], a: number, b: number, c: number): Tri {
  const A = pts[a];
  const B = pts[b];
  const C = pts[c];
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  const a2 = A.x * A.x + A.y * A.y;
  const b2 = B.x * B.x + B.y * B.y;
  const c2 = C.x * C.x + C.y * C.y;
  const cx = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
  const cy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
  return { a, b, c, cx, cy, r2: (A.x - cx) ** 2 + (A.y - cy) ** 2 };
}

/** Bowyer-Watson Delaunay triangulation. Returns the unique edges between real points. */
export function delaunayEdges(points: Pt[]): [number, number][] {
  const n = points.length;
  const big = 1e5;
  const pts: Pt[] = [...points, { x: -big, y: -big }, { x: big, y: -big }, { x: 0, y: big }];
  let tris: Tri[] = [makeTri(pts, n, n + 1, n + 2)];

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const bad = new Set<Tri>();
    for (const t of tris) {
      if ((p.x - t.cx) ** 2 + (p.y - t.cy) ** 2 <= t.r2) bad.add(t);
    }
    const boundary = new Map<string, [number, number, number]>();
    for (const t of bad) {
      for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]] as const) {
        const key = u < v ? `${u}:${v}` : `${v}:${u}`;
        const hit = boundary.get(key);
        if (hit) hit[2] += 1;
        else boundary.set(key, [u, v, 1]);
      }
    }
    tris = tris.filter((t) => !bad.has(t));
    for (const [u, v, count] of boundary.values()) {
      if (count === 1) tris.push(makeTri(pts, u, v, i));
    }
  }

  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const t of tris) {
    for (const [u, v] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]] as const) {
      if (u >= n || v >= n) continue;
      const key = u < v ? `${u}:${v}` : `${v}:${u}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(u < v ? [u, v] : [v, u]);
    }
  }
  return out;
}

function buildAdj(nodeCount: number, edges: Edge[]) {
  const adj: { to: number; edge: number }[][] = Array.from({ length: nodeCount }, () => []);
  edges.forEach((e, i) => {
    adj[e.a].push({ to: e.b, edge: i });
    adj[e.b].push({ to: e.a, edge: i });
  });
  return adj;
}

export function isConnected(g: Pick<Graph, 'nodes' | 'adj'>): boolean {
  if (g.nodes.length === 0) return true;
  const seen = new Uint8Array(g.nodes.length);
  const stack = [0];
  seen[0] = 1;
  let count = 1;
  while (stack.length) {
    const v = stack.pop() as number;
    for (const { to } of g.adj[v]) {
      if (!seen[to]) {
        seen[to] = 1;
        count += 1;
        stack.push(to);
      }
    }
  }
  return count === g.nodes.length;
}

export interface GenerateOptions {
  seed: number;
  nodeTarget: number;
  width: number;
  height: number;
}

/**
 * Procedural street network: jittered grid, Delaunay links, long links removed, a share of
 * redundant links dropped, and only the largest connected piece kept.
 */
export function generateGraph({ seed, nodeTarget, width, height }: GenerateOptions): Graph {
  const rng = createRng(seed);
  const aspect = width / height;
  const cols = Math.max(4, Math.round(Math.sqrt(nodeTarget * aspect)));
  const rows = Math.max(4, Math.round(nodeTarget / cols));
  const cw = width / cols;
  const ch = height / rows;

  const pts: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.06) continue;
      pts.push({
        x: Math.min(width, Math.max(0, (c + 0.5 + (rng() - 0.5) * 0.76) * cw)),
        y: Math.min(height, Math.max(0, (r + 0.5 + (rng() - 0.5) * 0.76) * ch)),
      });
    }
  }

  const maxLen = Math.hypot(cw, ch) * 1.3;
  let links = delaunayEdges(pts).filter(([a, b]) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y) <= maxLen);

  // Drop some redundant links so blocks are irregular, never leaving a node under two roads.
  const degree = new Uint16Array(pts.length);
  for (const [a, b] of links) {
    degree[a] += 1;
    degree[b] += 1;
  }
  links = links.filter(([a, b]) => {
    if (degree[a] > 3 && degree[b] > 3 && rng() < 0.2) {
      degree[a] -= 1;
      degree[b] -= 1;
      return false;
    }
    return true;
  });

  // Keep the largest connected component.
  const parent = pts.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (const [a, b] of links) parent[find(a)] = find(b);
  const sizes = new Map<number, number>();
  pts.forEach((_, i) => sizes.set(find(i), (sizes.get(find(i)) ?? 0) + 1));
  let best = -1;
  let bestSize = -1;
  for (const [root, size] of sizes) {
    if (size > bestSize) {
      best = root;
      bestSize = size;
    }
  }
  const remap = new Map<number, number>();
  const nodes: Pt[] = [];
  pts.forEach((p, i) => {
    if (find(i) === best) {
      remap.set(i, nodes.length);
      nodes.push(p);
    }
  });
  const edges: Edge[] = [];
  for (const [a, b] of links) {
    const na = remap.get(a);
    const nb = remap.get(b);
    if (na === undefined || nb === undefined) continue;
    edges.push({ a: na, b: nb, len: Math.hypot(nodes[na].x - nodes[nb].x, nodes[na].y - nodes[nb].y) });
  }
  return { nodes, edges, adj: buildAdj(nodes.length, edges), width, height };
}
