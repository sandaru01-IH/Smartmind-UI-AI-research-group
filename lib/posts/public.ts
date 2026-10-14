import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { SEED_POSTS } from '@/content/seed-posts';
import { CATEGORIES, type Category } from '@/lib/schemas';
import { createPublicClient } from '@/lib/supabase/public-client';
import { applyPublicQuery, visibleSeedPosts } from './query';
import { parsePostRow, parsePostRows, POST_COLUMNS } from './rows';
import type { Post, PublicListQuery, PublicListResult } from './types';

/**
 * Public read side. Cached and tagged so admin mutations can refresh it on demand.
 * Tags: 'posts' (everything), 'post:<slug>' (one article), 'latest' (ticker and Latest strip).
 * Demo mode (no Supabase env) serves content/seed-posts.ts through the same functions.
 */

const SCHEMA_ESCAPE = /[%_,()]/g;

export async function listPosts(query: PublicListQuery = {}): Promise<PublicListResult> {
  'use cache';
  cacheTag('posts');
  cacheLife('posts');

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
  if (query.category) req = req.eq('category', query.category);
  if (query.tag) req = req.contains('tags', [query.tag]);
  const q = query.q?.trim().replace(SCHEMA_ESCAPE, ' ');
  if (q) req = req.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  const { data, error, count } = await req;
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return { posts: parsePostRows(data), total: count ?? 0 };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  'use cache';
  cacheTag('posts', `post:${slug}`);
  cacheLife('posts');

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

export async function getLatestUpdates(limit: number): Promise<Post[]> {
  'use cache';
  cacheTag('posts', 'latest');
  cacheLife('posts');
  return (await listPosts({ type: 'update', limit })).posts;
}

export async function getFeaturedPost(): Promise<Post | null> {
  'use cache';
  cacheTag('posts', 'latest');
  cacheLife('posts');

  const db = createPublicClient();
  if (!db) {
    const pool = visibleSeedPosts(SEED_POSTS).filter((p) => p.type === 'article');
    return applyPublicQuery(pool.filter((p) => p.featured)).posts[0] ?? applyPublicQuery(pool).posts[0] ?? null;
  }
  const featured = await db
    .from('posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .eq('type', 'article')
    .eq('featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (featured.error) throw new Error(`Could not load featured post: ${featured.error.message}`);
  if (featured.data) return parsePostRow(featured.data);
  const newest = await listPosts({ type: 'article', limit: 1 });
  return newest.posts[0] ?? null;
}

export async function getSlugIndex(): Promise<{ slug: string; updated_at: string }[]> {
  'use cache';
  cacheTag('posts');
  cacheLife('posts');
  const { posts } = await listPosts({ type: 'article', limit: 500 });
  return posts.map((p) => ({ slug: p.slug, updated_at: p.updated_at }));
}

export async function getFilterOptions(): Promise<{ categories: Category[]; tags: string[] }> {
  'use cache';
  cacheTag('posts');
  cacheLife('posts');
  const { posts } = await listPosts({ type: 'article', limit: 500 });
  const present = new Set(posts.map((p) => p.category));
  const tags = Array.from(new Set(posts.flatMap((p) => p.tags))).sort();
  return { categories: CATEGORIES.filter((c) => present.has(c)), tags };
}
