import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { SEED_POSTS } from '@/content/seed-posts';
import { CATEGORIES, type Category } from '@/lib/schemas';
import { createPublicClient } from '@/lib/supabase/public-client';
import { applyPublicQuery, visibleSeedPosts } from './query';
import { parsePostRow, parsePostRows, POST_COLUMNS, POST_LIST_COLUMNS } from './rows';
import type { Post, PublicListQuery, PublicListResult } from './types';

/**
 * Public read side. Cached and tagged so admin mutations can refresh it on demand.
 * Tags: 'posts' (everything), 'post:<slug>' (one article), 'latest' (ticker and Latest strip).
 * Demo mode (no Supabase env) serves content/seed-posts.ts through the same functions.
 */

/** Only letters, digits and spaces reach the PostgREST filter, so a search can never add filters. */
const SCHEMA_ESCAPE = /[^\p{L}\p{N} ]/gu;

export async function listPosts(query: PublicListQuery = {}): Promise<PublicListResult> {
  'use cache';
  cacheTag('posts');
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });

  const db = createPublicClient();
  if (!db) return applyPublicQuery(visibleSeedPosts(SEED_POSTS), query);

  const limit = query.limit ?? 12;
  const offset = query.offset ?? 0;
  let req = db
    .from('posts')
    .select(POST_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (query.type) req = req.eq('type', query.type);
  if (query.news !== undefined) req = req.eq('show_in_news', query.news);
  if (query.ticker !== undefined) req = req.eq('show_in_ticker', query.ticker);
  if (query.gallery !== undefined) req = req.eq('in_gallery', query.gallery);
  if (query.category) req = req.eq('category', query.category);
  if (query.tag) req = req.contains('tags', [query.tag]);
  const q = query.q?.trim().replace(SCHEMA_ESCAPE, ' ');
  if (q) req = req.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  const { data, error, count } = await req;
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return { posts: parsePostRows(data), total: count ?? 0 };
}

/** One live post by slug, straight from the database. Never cached. */
async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const db = createPublicClient();
  if (!db) return visibleSeedPosts(SEED_POSTS).find((p) => p.slug === slug) ?? null;
  const { data, error } = await db
    .from('posts')
    .select(POST_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw new Error(`Could not load post: ${error.message}`);
  return parsePostRow(data);
}

/**
 * A post by slug. Cached for a long time, which lets known articles sit in the static page. Admin
 * edits, unpublishing and deletion expire it at once through updateTag. A cache miss on "not found"
 * is double-checked against the database by getPublicPost, so a post that was scheduled for later
 * appears the moment its time passes.
 */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  'use cache';
  cacheTag('posts', `post:${slug}`);
  cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
  return fetchPostBySlug(slug);
}

/** The post for a public page: the cached copy, or a fresh lookup when the cache says it is missing. */
export async function getPublicPost(slug: string): Promise<Post | null> {
  return (await getPostBySlug(slug)) ?? (await fetchPostBySlug(slug));
}

/** Items the admin flagged to roll in the "now" ticker at the top of every page. */
export async function getTickerItems(limit: number): Promise<Post[]> {
  'use cache';
  cacheTag('posts', 'latest');
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  return (await listPosts({ ticker: true, limit })).posts;
}

/** Moments for the gallery: posts the admin marked for it, newest event first. */
export async function getGalleryPosts(limit = 60): Promise<Post[]> {
  'use cache';
  cacheTag('posts', 'gallery');
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  return (await listPosts({ gallery: true, limit })).posts;
}

/**
 * Every live news article, newest first, without the article bodies. The news page, its filters and
 * the featured post are all worked out from this one cached list, so opening the news tab costs one
 * database read (or none, while the cache is warm) instead of one per filter.
 */
export async function getNewsPool(): Promise<Post[]> {
  'use cache';
  cacheTag('posts', 'latest');
  cacheLife({ stale: 60, revalidate: 120, expire: 86400 });

  const db = createPublicClient();
  if (!db) return applyPublicQuery(visibleSeedPosts(SEED_POSTS), { news: true }).posts;
  const { data, error } = await db
    .from('posts')
    .select(POST_LIST_COLUMNS)
    .eq('status', 'published')
    .eq('show_in_news', true)
    .order('published_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load news: ${error.message}`);
  return parsePostRows(data);
}

/** The featured article: the newest one marked featured, otherwise the newest full article. */
export const pickFeatured = (pool: readonly Post[]): Post | null =>
  pool.find((p) => p.featured) ?? pool.find((p) => p.type === 'article') ?? null;

export async function getFeaturedPost(): Promise<Post | null> {
  return pickFeatured(await getNewsPool());
}

export async function getSlugIndex(): Promise<{ slug: string; updated_at: string }[]> {
  'use cache';
  cacheTag('posts');
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  const { posts } = await listPosts({ type: 'article', limit: 500 });
  return posts.map((p) => ({ slug: p.slug, updated_at: p.updated_at }));
}

/** Categories and tags that at least one live news article uses. */
export const filterOptionsOf = (
  pool: readonly Post[],
): { categories: Category[]; tags: string[] } => {
  const present = new Set(pool.map((p) => p.category));
  return {
    categories: CATEGORIES.filter((c) => present.has(c)),
    tags: Array.from(new Set(pool.flatMap((p) => p.tags))).sort(),
  };
};

export async function getFilterOptions(): Promise<{ categories: Category[]; tags: string[] }> {
  return filterOptionsOf(await getNewsPool());
}
