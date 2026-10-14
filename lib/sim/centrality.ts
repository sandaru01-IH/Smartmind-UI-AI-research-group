import type { Graph } from './graph';
import { MinHeap } from './heap';
import { createRng } from './rng';

/**
 * Approximate betweenness centrality (Brandes, weighted by road length) from a sample of source
 * nodes. Returns values normalised to 0..1. Used to size nodes, echoing the lab's network-centrality work.
 */
export function betweenness(g: Graph, opts: { samples?: number; seed?: number } = {}): number[] {
  const n = g.nodes.length;
  const rng = createRng(opts.seed ?? 1);
  const samples = Math.min(opts.samples ?? 40, n);
  const sources: number[] = [];
  if (samples >= n) {
    for (let i = 0; i < n; i++) sources.push(i);
  } else {
    const pool = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < samples; i++) {
      const j = i + Math.floor(rng() * (n - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
      sources.push(pool[i]);
    }
  }

  const score = new Float64Array(n);
  const EPS = 1e-9;
  for (const s of sources) {
    const dist = new Float64Array(n).fill(Infinity);
    const sigma = new Float64Array(n);
    const done = new Uint8Array(n);
    const preds: number[][] = Array.from({ length: n }, () => []);
    const order: number[] = [];
    const heap = new MinHeap();
    dist[s] = 0;
    sigma[s] = 1;
    heap.push(0, s);
    for (let top = heap.pop(); top; top = heap.pop()) {
      const { key: d, val: v } = top;
      if (done[v] || d > dist[v] + EPS) continue;
      done[v] = 1;
      order.push(v);
      for (const { to, edge } of g.adj[v]) {
        const nd = d + g.edges[edge].len;
        if (nd < dist[to] - EPS) {
          dist[to] = nd;
          sigma[to] = sigma[v];
          preds[to] = [v];
          heap.push(nd, to);
        } else if (Math.abs(nd - dist[to]) <= EPS && !done[to]) {
          sigma[to] += sigma[v];
          preds[to].push(v);
        }
      }
    }
    const delta = new Float64Array(n);
    for (let i = order.length - 1; i >= 0; i--) {
      const w = order[i];
      for (const v of preds[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      if (w !== s) score[w] += delta[w];
    }
  }

  const max = Math.max(...score, 0);
  return Array.from(score, (v) => (max > 0 ? v / max : 0));
}
