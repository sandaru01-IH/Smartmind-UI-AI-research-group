import { describe, expect, it } from 'vitest';
import { seedNetwork } from './seed';
import { layoutNetwork } from './layout';

describe('layoutNetwork', () => {
  const { members, links } = seedNetwork();

  it('is deterministic', () => {
    expect(layoutNetwork(members, links, 1000, 620)).toEqual(
      layoutNetwork(members, links, 1000, 620),
    );
  });

  it('keeps every node inside the frame and apart from the others', () => {
    for (const [w, h] of [
      [1000, 620],
      [400, 640],
    ]) {
      const placed = layoutNetwork(members, links, w, h);
      expect(placed).toHaveLength(members.length);
      for (const p of placed) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(w);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(h);
      }
      for (let i = 0; i < placed.length; i++)
        for (let j = i + 1; j < placed.length; j++) {
          const d = Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y);
          expect(d, `${i} and ${j} overlap`).toBeGreaterThan(placed[i].r + placed[j].r - 6);
        }
    }
  });

  it('ignores links to people who are not in the list', () => {
    const placed = layoutNetwork(members.slice(0, 2), links, 1000, 620);
    expect(placed.every((p) => p.degree <= 1)).toBe(true);
  });

  it('handles an empty team and a single person', () => {
    expect(layoutNetwork([], [], 400, 300)).toEqual([]);
    expect(layoutNetwork(members.slice(0, 1), [], 400, 300)).toHaveLength(1);
  });
});
