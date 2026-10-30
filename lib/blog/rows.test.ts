import { describe, expect, it } from 'vitest';
import { FORMER_MEMBER_NAME, authorName, parseBlogPost, parseBlogSummaries } from './rows';

const author = { id: 'u1', display_name: 'Nimali Perera', bio: 'Planner.', photo_path: null };
const row = (extra: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'urban-flood-risk-3fa9c1',
  title: 'Urban flood risk',
  summary: 'Why floods matter.',
  cover_path: null,
  cover_alt: null,
  published_at: '2026-10-01T08:00:00+00:00',
  like_count: 4,
  author,
  comments: [{ count: 3 }],
  ...extra,
});

describe('parseBlogSummaries', () => {
  it('maps database rows to cards', () => {
    const [p] = parseBlogSummaries([row()]);
    expect(p).toMatchObject({
      id: 'p1',
      slug: 'urban-flood-risk-3fa9c1',
      title: 'Urban flood risk',
      likeCount: 4,
      commentCount: 3,
      author: { id: 'u1', displayName: 'Nimali Perera', bio: 'Planner.', photoPath: null },
    });
  });

  it('keeps a post whose author deleted their account, with no author', () => {
    const [p] = parseBlogSummaries([row({ author: null })]);
    expect(p.author).toBeNull();
    expect(authorName(p.author)).toBe(FORMER_MEMBER_NAME);
    expect(FORMER_MEMBER_NAME).toBe('Former member');
  });

  it('counts zero comments when the count is missing or empty', () => {
    expect(parseBlogSummaries([row({ comments: [] })])[0].commentCount).toBe(0);
    expect(parseBlogSummaries([row({ comments: null })])[0].commentCount).toBe(0);
  });

  it('returns an empty list for no rows and rejects malformed ones', () => {
    expect(parseBlogSummaries(null)).toEqual([]);
    expect(() => parseBlogSummaries([{ id: 'x' }])).toThrow();
  });
});

describe('parseBlogPost', () => {
  it('adds the body and a reading time', () => {
    const p = parseBlogPost(
      row({ body_md: 'word '.repeat(450), updated_at: '2026-10-02T00:00:00Z' }),
    );
    expect(p?.bodyMd.startsWith('word')).toBe(true);
    expect(p?.readingMinutes).toBe(3);
    expect(p?.updatedAt).toBe('2026-10-02T00:00:00Z');
  });

  it('is null for no row', () => {
    expect(parseBlogPost(null)).toBeNull();
  });
});
