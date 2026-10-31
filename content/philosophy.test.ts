import { describe, expect, it } from 'vitest';
import { IDENTITY, PILLARS, splitIdentityLine } from './philosophy';

describe('home headline', () => {
  it('uses the new full line', () => {
    expect(IDENTITY.line).toBe(
      'Understanding Complex Cities and Designing Adaptive, Dynamic Systems & applications for Sustainable Cities and Livable Communities — with Super Intelligence + Great Love.',
    );
  });

  it('splits into tiers that join back to the exact sentence', () => {
    const parts = splitIdentityLine(IDENTITY.line);
    expect(parts).toEqual({
      lead: 'Understanding Complex Cities',
      middle:
        'and Designing Adaptive, Dynamic Systems & applications for Sustainable Cities and Livable Communities',
      connector: '— with',
      close: 'Super Intelligence + Great Love.',
    });
    expect([parts!.lead, parts!.middle, parts!.connector, parts!.close].join(' ')).toBe(
      IDENTITY.line,
    );
  });

  it('does not split a sentence that has a different shape', () => {
    expect(splitIdentityLine('Understanding Complex Cities with Intelligence + Love.')).toBeNull();
  });

  it('leaves the pillar headlines unchanged', () => {
    const headlines = Object.values(PILLARS).map((p) => p.headline);
    expect(headlines).toContain('Intelligence + Love');
    expect(headlines).toContain('Open · Reproducible · Simple');
    expect(headlines).toContain('The Highest Intelligence, the Deepest Love');
  });
});
