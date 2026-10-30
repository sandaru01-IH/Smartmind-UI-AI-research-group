import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/brand';
import { getBlogSlugIndex } from '@/lib/blog/public';
import { getSlugIndex } from '@/lib/posts/public';

const STATIC_PATHS = [
  '/',
  '/about',
  '/research',
  '/team',
  '/publications',
  '/awards',
  '/gallery',
  '/news',
  '/blog',
  '/medium',
  '/videos',
  '/collaborate',
  '/contact',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, blogPosts] = await Promise.all([getSlugIndex(), getBlogSlugIndex()]);
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
    ...blogPosts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
    })),
  ];
}
