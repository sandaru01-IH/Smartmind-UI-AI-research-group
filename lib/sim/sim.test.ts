import { describe, expect, it } from 'vitest';
import { generateGraph, isConnected, type Graph } from './graph';
import { betweenness } from './centrality';
import { shortestPath } from './pathfinding';
import { MinHeap } from './heap';
import { RoadSim } from './sim';
import { createRng } from './rng';

/** A line of nodes 0-1-2-3-4 plus a longer detour 1-5-3. */
function lineGraph(): Graph {
  const nodes = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: 0 },
    { x: 30, y: 0 },
    { x: 40, y: 0 },
    { x: 20, y: 12 },
  ];
  const pairs: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [1, 5],
    [5, 3],
  ];
  const edges = pairs.map(([a, b]) => ({
    a,
    b,
    len: Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y),
  }));
  const adj: { to: number; edge: number }[][] = nodes.map(() => []);
  edges.forEach((e, i) => {
    adj[e.a].push({ to: e.b, edge: i });
    adj[e.b].push({ to: e.a, edge: i });
  });
  return { nodes, edges, adj, width: 40, height: 12 };
}

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('MinHeap', () => {
  it('pops in ascending order', () => {
    const h = new MinHeap();
    [5, 1, 4, 2, 3, 9, 0].forEach((k) => h.push(k, k * 10));
    const out: number[] = [];
    for (let e = h.pop(); e; e = h.pop()) out.push(e.key);
    expect(out).toEqual([0, 1, 2, 3, 4, 5, 9]);
  });
});

describe('generateGraph', () => {
  const g = generateGraph({ seed: 2024, nodeTarget: 190, width: 160, height: 100 });

  it('produces roughly the requested node count', () => {
    expect(g.nodes.length).toBeGreaterThanOrEqual(150);
    expect(g.nodes.length).toBeLessThanOrEqual(250);
  });
  it('is connected', () => {
    expect(isConnected(g)).toBe(true);
  });
  it('keeps every node inside the bounds', () => {
    for (const n of g.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x).toBeLessThanOrEqual(160);
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeLessThanOrEqual(100);
    }
  });
  it('has no duplicate or self edges', () => {
    const seen = new Set<string>();
    for (const e of g.edges) {
      expect(e.a).not.toBe(e.b);
      const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
  it('is deterministic', () => {
    const again = generateGraph({ seed: 2024, nodeTarget: 190, width: 160, height: 100 });
    expect(again.nodes).toEqual(g.nodes);
    expect(again.edges).toEqual(g.edges);
  });
  it('gives every node at least one road', () => {
    expect(g.adj.every((list) => list.length >= 1)).toBe(true);
  });
});

describe('betweenness', () => {
  it('ranks the middle of a corridor above its ends and stays within 0..1', () => {
    const g = lineGraph();
    const c = betweenness(g, { samples: g.nodes.length, seed: 1 });
    expect(Math.max(...c)).toBeCloseTo(1, 5);
    expect(Math.min(...c)).toBeGreaterThanOrEqual(0);
    expect(c[1]).toBeGreaterThan(c[0]);
    expect(c[3]).toBeGreaterThan(c[4]);
  });
});

describe('shortestPath', () => {
  const g = lineGraph();
  it('takes the direct corridor when open', () => {
    expect(shortestPath(g, 0, 4)).toEqual([0, 1, 2, 3, 4]);
  });
  it('reroutes around a blocked edge', () => {
    const blocked = new Uint8Array(g.edges.length);
    blocked[1] = 1; // edge 1-2
    expect(shortestPath(g, 0, 4, blocked)).toEqual([0, 1, 5, 3, 4]);
  });
  it('returns null when no route exists', () => {
    const blocked = new Uint8Array(g.edges.length).fill(1);
    expect(shortestPath(g, 0, 4, blocked)).toBeNull();
  });
  it('returns a single node for identical endpoints', () => {
    expect(shortestPath(g, 2, 2)).toEqual([2]);
  });
});

describe('RoadSim', () => {
  const make = (agents = 60) =>
    new RoadSim({
      graph: generateGraph({ seed: 3, nodeTarget: 160, width: 160, height: 100 }),
      agentCount: agents,
      seed: 9,
    });

  it('spawns the requested number of agents', () => {
    expect(make(60).agents.length).toBe(60);
  });
  it('moves agents along edges without leaving the graph', () => {
    const sim = make();
    for (let i = 0; i < 300; i++) sim.step(1 / 60);
    for (const a of sim.agents) {
      expect(a.edge).toBeGreaterThanOrEqual(0);
      expect(a.edge).toBeLessThan(sim.graph.edges.length);
      expect(a.t).toBeGreaterThanOrEqual(0);
      expect(a.t).toBeLessThanOrEqual(1);
    }
  });
  it('floods nearby edges and drains them afterwards', () => {
    const sim = make();
    const c = sim.graph.nodes[Math.floor(sim.graph.nodes.length / 2)];
    sim.addFlood(c.x, c.y);
    sim.step(1 / 60);
    expect(sim.blockedCount).toBeGreaterThan(0);
    for (let i = 0; i < 60 * 8; i++) sim.step(1 / 60);
    expect(sim.blockedCount).toBe(0);
  });
  it('selects the nearest road and floods the roads joined to it', () => {
    const sim = make();
    const edge = 10;
    const e = sim.graph.edges[edge];
    const mid = {
      x: (sim.graph.nodes[e.a].x + sim.graph.nodes[e.b].x) / 2,
      y: (sim.graph.nodes[e.a].y + sim.graph.nodes[e.b].y) / 2,
    };
    sim.addFlood(mid.x, mid.y);
    sim.step(1 / 60);
    expect(sim.selections.map((s) => s.edge)).toEqual([sim.nearestEdge(mid.x, mid.y)]);
    const selected = sim.selections[0].edge;
    const connected = sim.connectedEdges(selected);
    expect(connected.length).toBeGreaterThan(1);
    for (const i of connected) expect(sim.isBlocked(i)).toBe(true);
    expect(sim.blockedCount).toBe(connected.length);
  });
  it('ignores a pointer that is far from every road', () => {
    const sim = make();
    sim.addFlood(-500, -500);
    sim.step(1 / 60);
    expect(sim.selections).toHaveLength(0);
    expect(sim.blockedCount).toBe(0);
  });
  it('keeps a selection alive while the pointer stays on the road', () => {
    const sim = make();
    const n = sim.graph.nodes[5];
    sim.addFlood(n.x, n.y);
    for (let i = 0; i < 60 * 4; i++) {
      if (i % 30 === 0) sim.addFlood(n.x, n.y);
      sim.step(1 / 60);
    }
    expect(sim.blockedCount).toBeGreaterThan(0);
    expect(sim.selections).toHaveLength(1);
  });
  it('never routes an agent into a flooded edge it can avoid', () => {
    const sim = make(120);
    const c = sim.graph.nodes[Math.floor(sim.graph.nodes.length / 2)];
    for (let i = 0; i < 120; i++) {
      sim.addFlood(c.x, c.y);
      sim.step(1 / 60);
    }
    let entered = 0;
    let stillRoutedThroughFlood = 0;
    for (const a of sim.agents) {
      const next = a.path[a.pathIndex];
      if (next === undefined) continue;
      entered += 1;
      const e = sim.edgeBetween(a.to, next);
      if (e !== -1 && sim.isBlocked(e) && sim.reroutable(a)) stillRoutedThroughFlood += 1;
    }
    expect(entered).toBeGreaterThan(0);
    expect(stillRoutedThroughFlood).toBe(0);
  });
  it('can reduce its agent count', () => {
    const sim = make(100);
    sim.setAgentCount(40);
    expect(sim.agents.length).toBe(40);
  });
});
