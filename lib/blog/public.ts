import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public-client';
import { COMMENT_COLUMNS, parseComments, type BlogComment } from './engage';
import {
  BLOG_LIST_COLUMNS,
  BLOG_POST_COLUMNS,
  parseBlogPost,
  parseBlogSummaries,
  type AuthorRef,
  type BlogPost,
  type BlogPostSummary,
} from './rows';

/**
 * Public read side of the community blog. Whether a post is visible is decided by the database
 * (Row Level Security): published, not hidden by an admin, and its author not blocked. These
 * functions add no filter of their own, so a hidden post can never slip through here.
 * Tags: 'blog' (everything), 'blog:<slug>' (one post). Admin moderation expires both.
 */

const missingTable = (message: string) => /does not exist|schema cache/i.test(message);

export interface BlogListQuery {
  limit?: number;
  offset?: number;
  authorId?: string;
}

export async function listBlogPosts(
  query: BlogListQuery = {},
): Promise<{ posts: BlogPostSummary[]; total: number }> {
  'use cache';
  cacheTag('blog');
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const db = createPublicClient();
  if (!db) return { posts: [], total: 0 };
  const limit = query.limit ?? 9;
  const offset = query.offset ?? 0;
  let req = db
    .from('blog_posts')
    .select(BLOG_LIST_COLUMNS, { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (query.authorId) req = req.eq('author_id', query.authorId);
  const { data, error, count } = await req;
  if (error && missingTable(error.message)) return { posts: [], total: 0 };
  if (error) throw new Error(`Could not load blog posts: ${error.message}`);
  return { posts: parseBlogSummaries(data), total: count ?? 0 };
}

/** One live post by slug, straight from the database. Never cached. */
async function fetchBlogPost(slug: string): Promise<BlogPost | null> {
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db
    .from('blog_posts')
    .select(BLOG_POST_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error && missingTable(error.message)) return null;
  if (error) throw new Error(`Could not load the post: ${error.message}`);
  return parseBlogPost(data);
}

/** A post by slug, cached. Moderation and edits expire it at once through updateTag. */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  'use cache';
  cacheTag('blog', `blog:${slug}`);
  cacheLife({ stale: 60, revalidate: 300, expire: 86400 });
  return fetchBlogPost(slug);
}

/** The post for a public page: the cached copy, or a fresh lookup when the cache says it is missing. */
export async function getPublicBlogPost(slug: string): Promise<BlogPost | null> {
  return (await getBlogPost(slug)) ?? (await fetchBlogPost(slug));
}

/** A writer's public profile, or null when they are unknown or blocked. */
export async function getAuthor(id: string): Promise<AuthorRef | null> {
  'use cache';
  cacheTag('blog');
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const db = createPublicClient();
  if (!db) return null;
  const { data, error } = await db
    .from('member_profiles')
    .select('id,display_name,bio,photo_path')
    .eq('id', id)
    .maybeSingle();
  if (error && missingTable(error.message)) return null;
  if (error) throw new Error(`Could not load the author: ${error.message}`);
  return data
    ? {
        id: String(data.id),
        displayName: String(data.display_name),
        bio: String(data.bio ?? ''),
        photoPath: (data.photo_path as string | null) ?? null,
      }
    : null;
}

/** Every live post's address and last change, for the sitemap and for static params. */
export async function getBlogSlugIndex(): Promise<{ slug: string; updatedAt: string }[]> {
  'use cache';
  cacheTag('blog');
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from('blog_posts')
    .select('slug,updated_at')
    .order('published_at', { ascending: false })
    .limit(500);
  if (error && missingTable(error.message)) return [];
  if (error) throw new Error(`Could not load blog posts: ${error.message}`);
  return (data ?? []).map((r) => ({ slug: String(r.slug), updatedAt: String(r.updated_at) }));
}

/** The visible comments on a post, oldest first. Expired with the post's tag when anyone comments or moderates. */
export async function listComments(slug: string, postId: string): Promise<BlogComment[]> {
  'use cache';
  cacheTag('blog', `blog:${slug}`);
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db
    .from('blog_comments')
    .select(COMMENT_COLUMNS)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error && missingTable(error.message)) return [];
  if (error) throw new Error(`Could not load comments: ${error.message}`);
  return parseComments(data);
}
