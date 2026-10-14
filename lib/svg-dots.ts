export interface Dot {
  x: number;
  y: number;
  r: number;
}

export interface DotGroup {
  /** Radius shared by every dot in the group. */
  r: number;
  /** One path: a zero-length segment per dot. Stroke it with width 2r and round caps to draw circles. */
  d: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Packs many circles into a few <path> elements. Radii are snapped to `step`, then dots with the same
 * radius share a path. A hundred circles become a handful of short paths, which keeps decorative
 * SVG small in the HTML and in the framework payload.
 */
export function dotGroups(dots: readonly Dot[], step = 0.25): DotGroup[] {
  const groups = new Map<number, string>();
  for (const dot of dots) {
    const r = Math.max(step, Math.round(dot.r / step) * step);
    groups.set(r, `${groups.get(r) ?? ''}M${round1(dot.x)} ${round1(dot.y)}h0`);
  }
  return Array.from(groups, ([r, d]) => ({ r, d })).sort((a, b) => a.r - b.r);
}
