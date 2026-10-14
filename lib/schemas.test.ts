import { describe, expect, it } from 'vitest';
import { postInputSchema, quickUpdateSchema, loginSchema, CATEGORIES } from './schemas';

const article = {
  type: 'article' as const,
  title: 'A real headline',
  slug: 'a-real-headline',
  excerpt: 'Short summary.',
  body_md: 'Body text.',
  category: 'News' as const,
  tags: ['chatbot', 'nbro'],
  status: 'draft' as const,
};

describe('postInputSchema', () => {
  it('accepts a minimal article', () => {
    expect(postInputSchema.safeParse(article).success).toBe(true);
  });

  it('exposes the seven categories', () => {
    expect(CATEGORIES).toEqual(['News', 'Event', 'Research', 'Chatbot', 'Award', 'Publication', 'Partnership']);
  });

  it('rejects unknown categories', () => {
    expect(postInputSchema.safeParse({ ...article, category: 'Gossip' }).success).toBe(false);
  });

  it('rejects invalid slugs', () => {
    expect(postInputSchema.safeParse({ ...article, slug: 'Bad Slug' }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...article, slug: 'admin' }).success).toBe(false);
  });

  it('requires alt text when a cover is set', () => {
    const r = postInputSchema.safeParse({ ...article, cover_path: 'covers/a.webp', cover_alt: '' });
    expect(r.success).toBe(false);
    const ok = postInputSchema.safeParse({ ...article, cover_path: 'covers/a.webp', cover_alt: 'A road network' });
    expect(ok.success).toBe(true);
  });

  it('only allows http(s) links', () => {
    expect(postInputSchema.safeParse({ ...article, link_url: 'javascript:alert(1)' }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...article, link_url: 'data:text/html,hi' }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...article, link_url: 'https://example.org/x' }).success).toBe(true);
  });

  it('rejects malformed event dates', () => {
    expect(postInputSchema.safeParse({ ...article, event_date: '14/10/2026' }).success).toBe(false);
    expect(postInputSchema.safeParse({ ...article, event_date: '2026-10-14' }).success).toBe(true);
    expect(postInputSchema.safeParse({ ...article, event_date: '2026-02-31' }).success).toBe(false);
  });

  it('normalises tags: trims, lowercases, de-duplicates, caps at 8', () => {
    const r = postInputSchema.parse({ ...article, tags: [' Flood ', 'flood', 'Chatbot'] });
    expect(r.tags).toEqual(['flood', 'chatbot']);
    const tooMany = postInputSchema.safeParse({ ...article, tags: Array.from({ length: 9 }, (_, i) => `t${i}`) });
    expect(tooMany.success).toBe(false);
  });

  it('limits update headlines to 140 characters', () => {
    const base = { ...article, type: 'update' as const, body_md: '' };
    expect(postInputSchema.safeParse({ ...base, title: 'x'.repeat(140) }).success).toBe(true);
    expect(postInputSchema.safeParse({ ...base, title: 'x'.repeat(141) }).success).toBe(false);
  });

  it('rejects oversized bodies', () => {
    expect(postInputSchema.safeParse({ ...article, body_md: 'x'.repeat(50_001) }).success).toBe(false);
  });

  it('rejects an invalid published_at', () => {
    expect(postInputSchema.safeParse({ ...article, published_at: 'tomorrow' }).success).toBe(false);
  });
});

describe('quickUpdateSchema', () => {
  it('needs only a headline', () => {
    expect(quickUpdateSchema.safeParse({ title: 'Paper accepted' }).success).toBe(true);
  });
  it('rejects empty headlines and bad links', () => {
    expect(quickUpdateSchema.safeParse({ title: '   ' }).success).toBe(false);
    expect(quickUpdateSchema.safeParse({ title: 'ok', link_url: 'ftp://x' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires an email and a password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});
