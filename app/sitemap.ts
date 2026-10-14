import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/brand';
import { getSlugIndex } from '@/lib/posts/public';

const STATIC_PATHS = [
  '/',
  '/about',
  '/research',
  '/chatbots',
  '/team',
  '/publications',
  '/awards',
  '/partners',
  '/news',
  '/collaborate',
  '/contact',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSlugIndex();
  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'monthly' as const,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/news/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: 'monthly' as const,
    })),
  ];
}
