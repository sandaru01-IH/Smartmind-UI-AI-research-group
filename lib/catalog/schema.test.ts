import { describe, expect, it } from 'vitest';
import { numberWord, numberWordCap, plural } from '@/lib/number-words';
import { awardSchema, mediumSchema, partnerSchema, publicationSchema, themeSchema } from './schema';

describe('catalog schemas', () => {
  it('accepts a minimal award and defaults the flags', () => {
    const r = awardSchema.parse({ year: 2026, award: 'Best Paper' });
    expect(r).toMatchObject({ tbc: false, visible: true, who: '' });
  });

  it('rejects a missing name or an impossible year', () => {
    expect(awardSchema.safeParse({ year: 2026, award: '' }).success).toBe(false);
    expect(awardSchema.safeParse({ year: 12, award: 'Best Paper' }).success).toBe(false);
  });

  it('only allows http and https links', () => {
    const base = { year: 2026, title: 'A study' };
    expect(publicationSchema.safeParse({ ...base, href: 'https://x.org/a' }).success).toBe(true);
    expect(publicationSchema.safeParse({ ...base, href: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(publicationSchema.parse({ ...base, href: '' }).href).toBeNull();
    expect(partnerSchema.safeParse({ name: 'UDA', url: 'ftp://x' }).success).toBe(false);
  });

  it('keeps a theme to a known pattern and a sane project list', () => {
    expect(themeSchema.safeParse({ title: 'Urban', style: 'plaid' }).success).toBe(false);
    const r = themeSchema.parse({ title: 'Urban', projects: [{ title: 'Model' }] });
    expect(r.projects[0].src_funded).toBe(false);
  });
});

describe('medium article schema', () => {
  const base = { title: 'Why cities are systems', url: 'https://medium.com/@smartmind/why-cities' };

  it('accepts a minimal article and defaults the flags', () => {
    expect(mediumSchema.parse(base)).toMatchObject({ visible: true, summary: '', author_name: '' });
  });

  it('only allows https links to Medium', () => {
    expect(mediumSchema.safeParse({ ...base, url: 'javascript:alert(1)' }).success).toBe(false);
    expect(mediumSchema.safeParse({ ...base, url: 'http://medium.com/x' }).success).toBe(false);
    expect(mediumSchema.safeParse({ ...base, url: '' }).success).toBe(false);
  });

  it('needs a real title and alt text for a cover', () => {
    expect(mediumSchema.safeParse({ ...base, title: 'ab' }).success).toBe(false);
    expect(mediumSchema.safeParse({ ...base, cover_path: 'covers/2026/x.png' }).success).toBe(
      false,
    );
    expect(
      mediumSchema.safeParse({ ...base, cover_path: 'covers/2026/x.png', cover_alt: 'A city' })
        .success,
    ).toBe(true);
  });

  it('turns an empty publish date into null and rejects a bad one', () => {
    expect(mediumSchema.parse({ ...base, published_on: '' }).published_on).toBeNull();
    expect(mediumSchema.safeParse({ ...base, published_on: 'yesterday' }).success).toBe(false);
  });
});

describe('number words', () => {
  it('writes small counts as words and keeps big ones as digits', () => {
    expect(numberWord(4)).toBe('four');
    expect(numberWordCap(5)).toBe('Five');
    expect(numberWord(40)).toBe('40');
    expect(plural(1, 'project')).toBe('1 project');
    expect(plural(3, 'project')).toBe('3 projects');
  });
});
