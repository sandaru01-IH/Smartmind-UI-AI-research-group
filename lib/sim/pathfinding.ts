import type { Graph } from './graph';
import { MinHeap } from './heap';

/**
 * Dijkstra from `src` to `dst`. Edges flagged in `blocked` are impassable.
 * Returns the node sequence including both ends, or null when unreachable.
 */
export function shortestPath(
  g: Graph,
  src: number,
  dst: number,
  blocked?: Uint8Array,
): number[] | null {
  if (src === dst) return [src];
  const n = g.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap = new MinHeap();
  dist[src] = 0;
  heap.push(0, src);
  for (let top = heap.pop(); top; top = heap.pop()) {
    const { key: d, val: v } = top;
    if (d > dist[v]) continue;
    if (v === dst) break;
    for (const { to, edge } of g.adj[v]) {
      if (blocked && blocked[edge]) continue;
      const nd = d + g.edges[edge].len;
      if (nd < dist[to]) {
        dist[to] = nd;
        prev[to] = v;
        heap.push(nd, to);
      }
    }
  }
  if (!Number.isFinite(dist[dst])) return null;
  const path: number[] = [];
  for (let v = dst; v !== -1; v = prev[v]) path.push(v);
  return path.reverse();
}
