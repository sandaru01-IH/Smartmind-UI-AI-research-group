import { describe, expect, it } from 'vitest';
import { isPubliclyVisible, resolvePublishedAt, publicState } from './visibility';

const now = new Date('2026-10-14T10:00:00Z');

describe('isPubliclyVisible', () => {
  it('shows published posts whose time has passed', () => {
    expect(
      isPubliclyVisible({ status: 'published', published_at: '2026-10-14T09:59:59Z' }, now),
    ).toBe(true);
  });
  it('shows a post published exactly now', () => {
    expect(
      isPubliclyVisible({ status: 'published', published_at: '2026-10-14T10:00:00Z' }, now),
    ).toBe(true);
  });
  it('hides drafts, even with a past date', () => {
    expect(isPubliclyVisible({ status: 'draft', published_at: '2026-01-01T00:00:00Z' }, now)).toBe(
      false,
    );
  });
  it('hides scheduled posts until their time', () => {
    expect(
      isPubliclyVisible({ status: 'published', published_at: '2026-10-14T10:00:01Z' }, now),
    ).toBe(false);
  });
  it('hides published posts with no date', () => {
    expect(isPubliclyVisible({ status: 'published', published_at: null }, now)).toBe(false);
  });
  it('hides posts with an unparseable date', () => {
    expect(isPubliclyVisible({ status: 'published', published_at: 'nonsense' }, now)).toBe(false);
  });
});

describe('publicState', () => {
  it('names the four admin-facing states', () => {
    expect(publicState({ status: 'draft', published_at: null }, now)).toBe('draft');
    expect(publicState({ status: 'published', published_at: '2027-01-01T00:00:00Z' }, now)).toBe(
      'scheduled',
    );
    expect(publicState({ status: 'published', published_at: '2026-01-01T00:00:00Z' }, now)).toBe(
      'live',
    );
  });
});

describe('resolvePublishedAt', () => {
  it('uses now when publishing without a date', () => {
    expect(resolvePublishedAt('published', null, now)).toBe(now.toISOString());
  });
  it('keeps a scheduled date', () => {
    expect(resolvePublishedAt('published', '2026-12-01T09:00:00.000Z', now)).toBe(
      '2026-12-01T09:00:00.000Z',
    );
  });
  it('keeps the date on drafts so a schedule survives unpublishing', () => {
    expect(resolvePublishedAt('draft', '2026-12-01T09:00:00.000Z', now)).toBe(
      '2026-12-01T09:00:00.000Z',
    );
  });
  it('returns null for a draft with no date', () => {
    expect(resolvePublishedAt('draft', null, now)).toBeNull();
  });
});
