import type { Metadata } from 'next';

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
