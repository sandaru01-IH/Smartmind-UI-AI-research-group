import { describe, expect, it } from 'vitest';
import { readingMinutes } from './reading-time';

describe('readingMinutes', () => {
  it('is at least one minute, even for an empty body', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('A few words')).toBe(1);
  });

  it('counts 200 words a minute, rounding up', () => {
    expect(readingMinutes('word '.repeat(1000))).toBe(5);
    expect(readingMinutes('word '.repeat(1001))).toBe(6);
  });

  it('does not count markdown marks or image links as words', () => {
    const body = '## Heading\n\n![alt text](https://example.org/a.png)\n\n' + 'word '.repeat(10);
    expect(readingMinutes(body)).toBe(1);
  });
});
