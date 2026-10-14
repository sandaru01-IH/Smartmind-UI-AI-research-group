import { describe, expect, it } from 'vitest';
import { ALL_PUBLICATIONS } from '@/content/publications';
import { filterPublications } from './publications-filter';

const base = { q: '', year: 'all' as const, venue: 'all' };

describe('filterPublications', () => {
  it('returns everything with no filters', () => {
    expect(filterPublications(ALL_PUBLICATIONS, base)).toHaveLength(ALL_PUBLICATIONS.length);
  });
  it('filters by year', () => {
    const r = filterPublications(ALL_PUBLICATIONS, { ...base, year: 2021 });
    expect(r).toHaveLength(4);
    expect(r.every((p) => p.year === 2021)).toBe(true);
  });
  it('filters by venue', () => {
    const r = filterPublications(ALL_PUBLICATIONS, { ...base, venue: 'IJITEE 8(10S)' });
    expect(r).toHaveLength(2);
  });
  it('searches every word, ignoring case', () => {
    const r = filterPublications(ALL_PUBLICATIONS, { ...base, q: 'network CENTRALITY' });
    expect(r.length).toBeGreaterThan(3);
    expect(r.every((p) => /network/i.test(p.title) && /centrality/i.test(p.title + p.venue))).toBe(
      true,
    );
  });
  it('combines filters', () => {
    const r = filterPublications(ALL_PUBLICATIONS, { q: 'flood', year: 2019, venue: 'all' });
    expect(r.map((p) => p.id)).toEqual(['secm-2019-flood-built-form']);
  });
  it('returns nothing for a miss', () => {
    expect(filterPublications(ALL_PUBLICATIONS, { ...base, q: 'zzzz' })).toEqual([]);
  });
});
