import type { Metadata } from 'next';
import { BRAND, SITE_URL } from '@/content/brand';

/** Metadata for an inner page. The root layout adds the " | Smartmind, Urban Simulation Lab, ..." suffix. */
export function pageMeta({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type },
    twitter: { title, description },
  };
}

/** Tells search engines the site's name and address (used for the site name shown in results). */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.name,
    alternateName: [`${BRAND.name} ${BRAND.lab}`, 'Smartmind UI AI'],
    url: SITE_URL,
    inLanguage: 'en-GB',
  };
}
