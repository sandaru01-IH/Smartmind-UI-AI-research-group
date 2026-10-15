import type { TeamLink, TeamMember } from './types';

export interface Placed {
  id: string;
  x: number;
  y: number;
  r: number;
  degree: number;
}

/** Small deterministic generator so the same team always lays out the same way (server and client agree). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export const nodeRadius = (degree: number): number => 20 + Math.min(degree, 8) * 1.5;

/**
 * A force layout, run to rest once: every pair repels, every link is a spring, and a gentle pull
 * keeps the whole thing inside the frame. Cheap for a team-sized graph (tens of people).
 */
export function layoutNetwork(
  members: readonly TeamMember[],
  links: readonly TeamLink[],
  width: number,
  height: number,
  margin: { x: number; top: number; bottom: number } = { x: 36, top: 36, bottom: 36 },
): Placed[] {
  const n = members.length;
  if (n === 0) return [];
  const index = new Map(members.map((m, i) => [m.id, i]));
  const degree = new Array<number>(n).fill(0);
  const edges: [number, number][] = [];
  for (const l of links) {
    const a = index.get(l.a);
    const b = index.get(l.b);
    if (a === undefined || b === undefined || a === b) continue;
    edges.push([a, b]);
    degree[a]++;
    degree[b]++;
  }

  const radius = degree.map(nodeRadius);
  const { x: padX, top: padTop, bottom: padBottom } = margin;
  const cx = width / 2;
  const cy = (padTop + height - padBottom) / 2;
  const rand = rng(hash(members.map((m) => m.id).join('|')) ^ n);

  // Start on a spiral so the first frame already uses the whole area.
  const px = new Array<number>(n);
  const py = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const ang = i * 2.399963 + rand() * 0.4;
    px[i] = cx + Math.cos(ang) * (width / 2 - padX) * 0.8 * Math.sqrt(t);
    py[i] = cy + Math.sin(ang) * ((height - padTop - padBottom) / 2) * 0.8 * Math.sqrt(t);
  }

  // Ideal spacing from the area per person.
  const k = Math.sqrt(((width - padX * 2) * (height - padTop - padBottom)) / n) * 0.8;
  const vx = new Array<number>(n).fill(0);
  const vy = new Array<number>(n).fill(0);
  const steps = 320;

  for (let step = 0; step < steps; step++) {
    const cool = 1 - step / steps;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = px[i] - px[j];
        let dy = py[i] - py[j];
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = rand() - 0.5;
          dy = rand() - 0.5;
          d2 = dx * dx + dy * dy + 0.01;
        }
        const d = Math.sqrt(d2);
        // Names are wider than the circles, so sideways closeness counts for more than it looks.
        const dScaled = Math.sqrt(dx * dx * 0.16 + dy * dy) || d;
        const force = (k * k) / dScaled;
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        vx[i] += fx;
        vy[i] += fy;
        vx[j] -= fx;
        vy[j] -= fy;
      }
    }
    for (const [a, b] of edges) {
      const dx = px[b] - px[a];
      const dy = py[b] - py[a];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (d * d) / k / 3;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      vx[a] += fx;
      vy[a] += fy;
      vx[b] -= fx;
      vy[b] -= fy;
    }
    for (let i = 0; i < n; i++) {
      vx[i] += (cx - px[i]) * 0.04;
      vy[i] += (cy - py[i]) * 0.04;
      const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]) || 1;
      const cap = Math.min(speed, 12 * cool + 0.5);
      px[i] += (vx[i] / speed) * cap;
      py[i] += (vy[i] / speed) * cap;
      vx[i] = 0;
      vy[i] = 0;
      px[i] = Math.min(width - padX, Math.max(padX, px[i]));
      py[i] = Math.min(height - padBottom, Math.max(padTop, py[i]));
    }
  }

  return members.map((m, i) => ({
    id: m.id,
    x: Math.round(px[i] * 10) / 10,
    y: Math.round(py[i] * 10) / 10,
    r: radius[i],
    degree: degree[i],
  }));
}
