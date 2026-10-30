import { describe, expect, it } from 'vitest';
import {
  FLAT_NAV_ITEMS,
  NAV_ITEMS,
  PAGE_INDEX,
  STORIES_GROUP,
  isNavGroup,
} from '@/components/layout/nav-items';

describe('primary navigation', () => {
  it('keeps eight top-level entries, with News moved into the Stories group', () => {
    expect(NAV_ITEMS).toHaveLength(8);
    const topLevelHrefs = NAV_ITEMS.filter((e) => !isNavGroup(e)).map(
      (e) => (e as { href: string }).href,
    );
    expect(topLevelHrefs).not.toContain('/news');
    expect(NAV_ITEMS.filter(isNavGroup)).toEqual([STORIES_GROUP]);
  });

  it('puts Blog, Medium articles, Videos and News in the Stories group, in that order', () => {
    expect(STORIES_GROUP.label).toBe('Stories');
    expect(STORIES_GROUP.children.map((c) => c.href)).toEqual([
      '/blog',
      '/medium',
      '/videos',
      '/news',
    ]);
  });

  it('lists every page once in the flat index', () => {
    const hrefs = PAGE_INDEX.map((p) => p.href);
    expect(hrefs).toContain('/news');
    expect(hrefs).toContain('/blog');
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(FLAT_NAV_ITEMS.map((p) => p.href)).toEqual(expect.arrayContaining(['/blog', '/news']));
  });
});
