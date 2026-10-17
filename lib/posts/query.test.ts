import { describe, expect, it } from 'vitest';
import { SEED_POSTS } from '@/content/seed-posts';
import { applyPublicQuery, applyAdminQuery, visibleSeedPosts } from './query';

const now = new Date('2026-10-14T10:00:00Z');
const visible = visibleSeedPosts(SEED_POSTS, now);

describe('seed content rules', () => {
  it('never publishes anything flagged to be confirmed', () => {
    const tbc = SEED_POSTS.filter((p) => p.tbc);
    expect(tbc.length).toBeGreaterThan(0);
    expect(tbc.every((p) => p.status === 'draft')).toBe(true);
  });
  it('has unique slugs and ids', () => {
    expect(new Set(SEED_POSTS.map((p) => p.slug)).size).toBe(SEED_POSTS.length);
    expect(new Set(SEED_POSTS.map((p) => p.id)).size).toBe(SEED_POSTS.length);
  });
  it('shows only published, already-live posts', () => {
    expect(visible.every((p) => p.status === 'published')).toBe(true);
    expect(visible.some((p) => p.slug === 'icsd-2025-best-scientific-paper')).toBe(false);
  });
});

describe('applyPublicQuery', () => {
  it('sorts newest first', () => {
    const { posts } = applyPublicQuery(visible, {});
    const times = posts.map((p) => Date.parse(p.published_at!));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
  it('filters by type', () => {
    const { posts } = applyPublicQuery(visible, { type: 'article' });
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.type === 'article')).toBe(true);
  });
  it('filters by category and tag', () => {
    expect(
      applyPublicQuery(visible, { category: 'Partnership' }).posts.every(
        (p) => p.category === 'Partnership',
      ),
    ).toBe(true);
    expect(
      applyPublicQuery(visible, { tag: 'nbro' }).posts.every((p) => p.tags.includes('nbro')),
    ).toBe(true);
  });
  it('searches title and excerpt case-insensitively', () => {
    const { posts } = applyPublicQuery(visible, { q: 'MANCHESTER' });
    expect(posts.length).toBeGreaterThan(0);
  });
  it('paginates and reports the total', () => {
    const all = applyPublicQuery(visible, {});
    const page = applyPublicQuery(visible, { limit: 1, offset: 1 });
    expect(page.total).toBe(all.total);
    expect(page.posts).toHaveLength(1);
    expect(page.posts[0].id).toBe(all.posts[1].id);
  });
});

describe('applyAdminQuery', () => {
  it('filters drafts', () => {
    const r = applyAdminQuery(SEED_POSTS, { status: 'draft' }, now);
    expect(r.length).toBe(2);
  });
  it('finds scheduled posts', () => {
    const future = {
      ...SEED_POSTS[0],
      id: 'x',
      slug: 'future',
      published_at: '2027-01-01T00:00:00.000Z',
    };
    expect(applyAdminQuery([future], { status: 'scheduled' }, now)).toHaveLength(1);
    expect(applyAdminQuery([future], { status: 'published' }, now)).toHaveLength(0);
  });
  it('sorts by title', () => {
    const r = applyAdminQuery(SEED_POSTS, { sort: 'title' }, now);
    const titles = r.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });
});
