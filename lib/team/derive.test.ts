import { describe, expect, it } from 'vitest';
import { deriveLinks } from './derive';
import type { MemberWork } from '@/lib/catalog/types';

const work = (key: string, title: string): MemberWork => ({
  key,
  kind: 'paper',
  title,
  year: 2026,
  href: null,
  internal: false,
});

describe('deriveLinks', () => {
  it('connects people who share a piece of work, once per pair', () => {
    const links = deriveLinks(
      { a: [work('p:1', 'Flood paper')], b: [work('p:1', 'Flood paper')], c: [] },
      [],
    );
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ a: 'a', b: 'b', label: 'Flood paper' });
  });

  it('summarises several shared works and skips pairs already linked by hand', () => {
    const shared = {
      a: [work('1', 'One'), work('2', 'Two')],
      b: [work('1', 'One'), work('2', 'Two')],
    };
    expect(deriveLinks(shared, [])[0].label).toBe('2 shared works');
    expect(deriveLinks(shared, [{ id: 'x', a: 'b', b: 'a', label: 'Mentor' }])).toEqual([]);
  });

  it('adds nothing for people with separate work', () => {
    expect(deriveLinks({ a: [work('1', 'One')], b: [work('2', 'Two')] }, [])).toEqual([]);
  });
});
