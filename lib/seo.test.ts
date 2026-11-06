import { describe, expect, it } from 'vitest';
import { BRAND, SITE_URL } from '@/content/brand';
import { websiteJsonLd } from './seo';

describe('websiteJsonLd', () => {
  it('names the site and its address so search engines can show the site name', () => {
    expect(websiteJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND.name,
      alternateName: [`${BRAND.name} ${BRAND.lab}`, 'Smartmind UI AI'],
      url: SITE_URL,
      inLanguage: 'en-GB',
    });
  });
});
