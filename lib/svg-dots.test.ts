import { describe, expect, it } from 'vitest';
import { dotGroups } from './svg-dots';

describe('dotGroups', () => {
  it('groups dots by snapped radius', () => {
    const groups = dotGroups([
      { x: 1, y: 2, r: 0.5 },
      { x: 3, y: 4, r: 0.52 },
      { x: 5, y: 6, r: 1.5 },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ r: 0.5, d: 'M1 2h0M3 4h0' });
    expect(groups[1].r).toBe(1.5);
  });
  it('keeps one zero-length segment per dot', () => {
    const dots = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i, r: 0.4 + (i % 5) * 0.3 }));
    const groups = dotGroups(dots);
    expect(groups.reduce((n, g) => n + (g.d.match(/h0/g) ?? []).length, 0)).toBe(100);
    expect(groups.length).toBeLessThanOrEqual(8);
  });
  it('never returns a zero radius', () => {
    expect(dotGroups([{ x: 0, y: 0, r: 0 }])[0].r).toBeGreaterThan(0);
  });
});
