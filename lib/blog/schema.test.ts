import { describe, expect, it } from 'vitest';
import { blogPostInputSchema, memberProfileSchema } from './schema';

const base = { title: 'Why cities are systems', summary: '', body_md: 'Body' };

describe('blogPostInputSchema', () => {
  it('accepts a minimal post and trims the title', () => {
    const r = blogPostInputSchema.parse({ ...base, title: '  Why cities are systems  ' });
    expect(r.title).toBe('Why cities are systems');
    expect(r.cover_path).toBeNull();
  });

  it('keeps titles to 3-160 characters, summaries to 300 and bodies to 50,000', () => {
    expect(blogPostInputSchema.safeParse({ ...base, title: 'ab' }).success).toBe(false);
    expect(blogPostInputSchema.safeParse({ ...base, title: 'x'.repeat(161) }).success).toBe(false);
    expect(blogPostInputSchema.safeParse({ ...base, summary: 'x'.repeat(301) }).success).toBe(
      false,
    );
    expect(blogPostInputSchema.safeParse({ ...base, body_md: 'x'.repeat(50_001) }).success).toBe(
      false,
    );
    expect(blogPostInputSchema.safeParse({ ...base, body_md: 'x'.repeat(50_000) }).success).toBe(
      true,
    );
  });

  it('needs alt text whenever there is a cover', () => {
    const cover = { cover_path: 'members/u/a.png' };
    expect(blogPostInputSchema.safeParse({ ...base, ...cover }).success).toBe(false);
    expect(blogPostInputSchema.safeParse({ ...base, ...cover, cover_alt: 'A city' }).success).toBe(
      true,
    );
  });
});

describe('memberProfileSchema', () => {
  it('trims the name and limits the bio to 500 characters', () => {
    expect(memberProfileSchema.parse({ display_name: '  Ada  ', bio: '' }).display_name).toBe(
      'Ada',
    );
    expect(memberProfileSchema.safeParse({ display_name: 'A', bio: '' }).success).toBe(false);
    expect(
      memberProfileSchema.safeParse({ display_name: 'Ada', bio: 'x'.repeat(501) }).success,
    ).toBe(false);
  });
});
