import { describe, expect, it } from 'vitest';
import { parseAdminComments, parseAdminMembers, parseAdminPosts } from './admin';

describe('parseAdminPosts', () => {
  const row = (extra: Record<string, unknown> = {}) => ({
    id: 'p1',
    slug: 'urban-flood-risk-3fa9c1',
    title: 'Urban flood risk',
    status: 'published',
    published_at: '2026-10-01T08:00:00+00:00',
    hidden: false,
    like_count: 2,
    created_at: '2026-10-01T07:00:00+00:00',
    author: { id: 'u1', display_name: 'Ada', blocked: false },
    ...extra,
  });

  it('maps rows for the moderation list', () => {
    const [p] = parseAdminPosts([row()]);
    expect(p).toMatchObject({
      id: 'p1',
      slug: 'urban-flood-risk-3fa9c1',
      title: 'Urban flood risk',
      status: 'published',
      hidden: false,
      authorName: 'Ada',
      authorBlocked: false,
    });
  });

  it('shows "Former member" when the writer deleted their account', () => {
    const [p] = parseAdminPosts([row({ author: null })]);
    expect(p.authorName).toBe('Former member');
    expect(p.authorBlocked).toBe(false);
  });

  it('keeps a hidden post and a draft', () => {
    const [h, d] = parseAdminPosts([
      row({ hidden: true }),
      row({ id: 'p2', status: 'draft', published_at: null }),
    ]);
    expect(h.hidden).toBe(true);
    expect(d.status).toBe('draft');
    expect(d.publishedAt).toBeNull();
  });
});

describe('parseAdminComments', () => {
  it('maps a comment with its post and writer', () => {
    const [c] = parseAdminComments([
      {
        id: 'c1',
        body: 'Hello there',
        hidden: true,
        created_at: '2026-10-02T10:00:00+00:00',
        post: { id: 'p1', slug: 'a-post-abc123', title: 'A post' },
        author: { id: 'u1', display_name: 'Ada' },
      },
    ]);
    expect(c).toMatchObject({
      id: 'c1',
      body: 'Hello there',
      hidden: true,
      postSlug: 'a-post-abc123',
      postTitle: 'A post',
      authorName: 'Ada',
    });
  });

  it('copes with a deleted post or writer', () => {
    const [c] = parseAdminComments([
      {
        id: 'c2',
        body: 'x',
        hidden: false,
        created_at: '2026-10-02T10:00:00+00:00',
        post: null,
        author: null,
      },
    ]);
    expect(c.postSlug).toBeNull();
    expect(c.authorName).toBe('Former member');
  });
});

describe('parseAdminMembers', () => {
  it('maps the members list with email and block state', () => {
    const [m] = parseAdminMembers([
      {
        id: 'u1',
        email: 'ada@example.org',
        display_name: 'Ada',
        blocked: true,
        created_at: '2026-09-01T00:00:00+00:00',
      },
    ]);
    expect(m).toEqual({
      id: 'u1',
      email: 'ada@example.org',
      displayName: 'Ada',
      blocked: true,
      createdAt: '2026-09-01T00:00:00+00:00',
    });
  });

  it('is an empty list for no rows', () => {
    expect(parseAdminMembers(null)).toEqual([]);
  });
});
