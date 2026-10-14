import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug, isValidSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Meeting with NBRO and Manchester')).toBe('meeting-with-nbro-and-manchester');
  });
  it('strips accents and punctuation', () => {
    expect(slugify('  Café: Dresden’s “Street Cloud”!  ')).toBe('cafe-dresdens-street-cloud');
  });
  it('collapses repeated separators', () => {
    expect(slugify('a --  b___c')).toBe('a-b-c');
  });
  it('limits length without a trailing hyphen', () => {
    const s = slugify('word '.repeat(40));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith('-')).toBe(false);
  });
  it('falls back for empty or non-latin titles', () => {
    expect(slugify('')).toBe('post');
    expect(slugify('නගර')).toBe('post');
  });
});

describe('uniqueSlug', () => {
  it('returns the base when free', () => {
    expect(uniqueSlug('hello', new Set())).toBe('hello');
  });
  it('appends the next free number', () => {
    expect(uniqueSlug('hello', new Set(['hello', 'hello-2']))).toBe('hello-3');
  });
  it('avoids reserved words', () => {
    expect(uniqueSlug('admin', new Set())).toBe('admin-2');
  });
  it('keeps the suffixed slug within the length limit', () => {
    const base = 'a'.repeat(80);
    const out = uniqueSlug(base, new Set([base]));
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith('-2')).toBe(true);
  });
});

describe('isValidSlug', () => {
  it.each(['hello', 'a-b-c', 'post-2'])('accepts %s', (s) => expect(isValidSlug(s)).toBe(true));
  it.each(['Hello', 'a_b', '-a', 'a-', 'a--b', '', 'admin', 'a'.repeat(81)])('rejects %s', (s) =>
    expect(isValidSlug(s)).toBe(false),
  );
});
