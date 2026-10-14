import type { Graph } from './graph';
import { shortestPath } from './pathfinding';
import { createRng } from './rng';

export interface Agent {
  /** Edge being travelled, and the node it started from and heads to. */
  edge: number;
  from: number;
  to: number;
  /** Progress along the edge, 0..1. */
  t: number;
  speed: number;
  /** Nodes still to visit after `to`. */
  path: number[];
  pathIndex: number;
  dest: number;
}

interface Flood {
  x: number;
  y: number;
  age: number;
}

export interface RoadSimOptions {
  graph: Graph;
  agentCount: number;
  seed?: number;
  /** Optional 0..1 node weights. Busy junctions attract more trips. */
  centrality?: number[];
}

function segmentDistSq(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return (px - cx) ** 2 + (py - cy) ** 2;
}

const FLOOD_LIFE = 3.2; // seconds a ripple stays flooded
const FLOOD_RADIUS = 13; // world units, where the world is 100 units tall
const REPLAN_BUDGET = 40; // agents re-planned per step, to keep frames short

export class RoadSim {
  readonly graph: Graph;
  agents: Agent[] = [];
  floods: Flood[] = [];
  /** 1 where an edge is currently flooded. */
  readonly blocked: Uint8Array;
  blockedCount = 0;

  private readonly rng: () => number;
  private readonly weights: number[];
  private weightTotal: number;
  private version = 0;
  private seenVersion = 0;
  private replanQueue: number[] = [];

  constructor({ graph, agentCount, seed = 1, centrality }: RoadSimOptions) {
    this.graph = graph;
    this.blocked = new Uint8Array(graph.edges.length);
    this.rng = createRng(seed);
    this.weights = graph.nodes.map((_, i) => 0.25 + (centrality?.[i] ?? 0));
    this.weightTotal = this.weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < agentCount; i++) this.agents.push(this.spawn());
  }

  get floodRadius(): number {
    return FLOOD_RADIUS;
  }

  isBlocked(edge: number): boolean {
    return this.blocked[edge] === 1;
  }

  edgeBetween(a: number, b: number): number {
    for (const { to, edge } of this.graph.adj[a]) if (to === b) return edge;
    return -1;
  }

  /** True when a route to the agent's destination exists that avoids every flooded road. */
  reroutable(a: Agent): boolean {
    return shortestPath(this.graph, a.to, a.dest, this.blocked) !== null;
  }

  /** Raise a flood ripple at a world position. Nearby ripples are refreshed, not stacked. */
  addFlood(x: number, y: number): void {
    const merge = FLOOD_RADIUS * 0.4;
    for (const f of this.floods) {
      if ((f.x - x) ** 2 + (f.y - y) ** 2 < merge * merge) {
        f.age = 0;
        f.x = x;
        f.y = y;
        return;
      }
    }
    if (this.floods.length < 24) this.floods.push({ x, y, age: 0 });
  }

  floodRadiusAt(f: Flood): number {
    const life = Math.max(0, 1 - f.age / FLOOD_LIFE);
    const grow = Math.min(1, f.age / 0.18 + 0.35);
    return FLOOD_RADIUS * grow * Math.sqrt(life);
  }

  setAgentCount(count: number): void {
    while (this.agents.length > count) this.agents.pop();
    while (this.agents.length < count) this.agents.push(this.spawn());
  }

  step(dtRaw: number): void {
    const dt = Math.min(Math.max(dtRaw, 0), 0.05);
    this.updateFloods(dt);
    if (this.version !== this.seenVersion) {
      this.seenVersion = this.version;
      this.queueAffected();
    }
    this.replan();
    for (const a of this.agents) this.advance(a, dt);
  }

  // ---------------------------------------------------------------- floods
  private updateFloods(dt: number): void {
    for (const f of this.floods) f.age += dt;
    this.floods = this.floods.filter((f) => f.age < FLOOD_LIFE);

    let changed = false;
    let count = 0;
    const { nodes, edges } = this.graph;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      let hit = 0;
      for (const f of this.floods) {
        const r = this.floodRadiusAt(f);
        if (segmentDistSq(f.x, f.y, nodes[e.a], nodes[e.b]) <= r * r) {
          hit = 1;
          break;
        }
      }
      if (hit !== this.blocked[i]) {
        this.blocked[i] = hit;
        changed = true;
      }
      count += hit;
    }
    this.blockedCount = count;
    if (changed) this.version += 1;
  }

  private queueAffected(): void {
    this.replanQueue = [];
    this.agents.forEach((a, i) => {
      let prev = a.to;
      for (let k = a.pathIndex; k < a.path.length && k < a.pathIndex + 40; k++) {
        const e = this.edgeBetween(prev, a.path[k]);
        if (e !== -1 && this.blocked[e]) {
          this.replanQueue.push(i);
          return;
        }
        prev = a.path[k];
      }
    });
  }

  private replan(): void {
    let budget = REPLAN_BUDGET;
    while (budget-- > 0 && this.replanQueue.length) {
      const agent = this.agents[this.replanQueue.pop() as number];
      if (agent) this.plan(agent, agent.to, true);
    }
  }

  // ----------------------------------------------------------------- agents
  private pickNode(): number {
    let r = this.rng() * this.weightTotal;
    for (let i = 0; i < this.weights.length; i++) {
      r -= this.weights[i];
      if (r <= 0) return i;
    }
    return this.weights.length - 1;
  }

  private spawn(): Agent {
    const { adj } = this.graph;
    let from = this.pickNode();
    for (let guard = 0; adj[from].length === 0 && guard < 20; guard++) from = this.pickNode();
    const first = adj[from][Math.floor(this.rng() * adj[from].length)];
    const agent: Agent = {
      edge: first.edge,
      from,
      to: first.to,
      t: this.rng(),
      speed: 8 + this.rng() * 9,
      path: [],
      pathIndex: 0,
      dest: from,
    };
    this.plan(agent, agent.to, false);
    return agent;
  }

  /** Choose a path from `origin` to the agent's destination, or a new destination if it is cut off. */
  private plan(a: Agent, origin: number, keepDest: boolean): void {
    if (keepDest) {
      const route = shortestPath(this.graph, origin, a.dest, this.blocked);
      if (route) {
        a.path = route.slice(1);
        a.pathIndex = 0;
        return;
      }
    }
    for (let tries = 0; tries < 6; tries++) {
      const dest = this.pickNode();
      if (dest === origin) continue;
      const route = shortestPath(this.graph, origin, dest, this.blocked);
      if (route) {
        a.dest = dest;
        a.path = route.slice(1);
        a.pathIndex = 0;
        return;
      }
    }
    a.path = [];
    a.pathIndex = 0;
  }

  private advance(a: Agent, dt: number): void {
    const edge = this.graph.edges[a.edge];
    // Water on the road slows traffic that is already on it.
    const slow = this.blocked[a.edge] ? 0.3 : 1;
    a.t += (a.speed * slow * dt) / Math.max(edge.len, 0.001);
    while (a.t >= 1) {
      a.t -= 1;
      const here = a.to;
      if (a.pathIndex >= a.path.length) this.plan(a, here, false);
      const next = a.path[a.pathIndex];
      if (next === undefined) {
        // Stranded: head back along the same road and try again next time round.
        a.to = a.from;
        a.from = here;
        a.t = 0.999;
        return;
      }
      const e = this.edgeBetween(here, next);
      if (e === -1) {
        this.plan(a, here, false);
        return;
      }
      a.pathIndex += 1;
      a.from = here;
      a.to = next;
      a.edge = e;
    }
  }
}
