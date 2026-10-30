import { describe, expect, it } from 'vitest';
import { IDENTITY, PILLARS } from './philosophy';

describe('home headline', () => {
  it('uses the new full line', () => {
    expect(IDENTITY.line).toBe(
      'Understanding Complex Cities and Designing Adaptive, Dynamic Systems & applications for Sustainable Cities and Livable Communities — with Super Intelligence + Great Love.',
    );
  });

  it('leaves the pillar headlines unchanged', () => {
    const headlines = Object.values(PILLARS).map((p) => p.headline);
    expect(headlines).toContain('Intelligence + Love');
    expect(headlines).toContain('Open · Reproducible · Simple');
    expect(headlines).toContain('The Highest Intelligence, the Deepest Love');
  });
});
