import { describe, expect, it } from 'vitest';
import { isValidSlug } from '@/lib/slug';
import { makeBlogSlug } from './slug';

describe('makeBlogSlug', () => {
  it('turns a title into a readable slug with a short unique ending', () => {
    expect(makeBlogSlug('Urban Flood Risk')).toMatch(/^urban-flood-risk-[0-9a-f]{6}$/);
  });

  it('gives Sinhala, Tamil and emoji-only titles a valid slug too', () => {
    for (const title of ['නගර සැලසුම', 'நகர திட்டம்', '🌆🌆', '   ']) {
      const slug = makeBlogSlug(title);
      expect(slug, title).toMatch(/^post-[0-9a-f]{6}$/);
      expect(isValidSlug(slug), title).toBe(true);
    }
  });

  it('never returns the same slug twice for the same title', () => {
    const slugs = new Set(Array.from({ length: 20 }, () => makeBlogSlug('Same title')));
    expect(slugs.size).toBe(20);
  });

  it('keeps long titles within the 80 character limit and valid', () => {
    const slug = makeBlogSlug('word '.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(isValidSlug(slug)).toBe(true);
  });

  it('does not let a title claim a reserved word', () => {
    expect(isValidSlug(makeBlogSlug('admin'))).toBe(true);
    expect(makeBlogSlug('admin')).not.toBe('admin');
  });
});
