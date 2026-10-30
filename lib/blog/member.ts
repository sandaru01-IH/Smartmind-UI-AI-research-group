import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { BlogPostInput, MemberProfileInput } from './schema';
import { MY_POST_COLUMNS, type MyBlogPost } from './types';

/**
 * A writer's own data, read and written with their session client. Row Level Security is what keeps
 * each person to their own posts; these functions never take an author id from the caller.
 */

const myPostRow = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  body_md: z.string(),
  cover_path: z.string().nullable(),
  cover_alt: z.string().nullable(),
  status: z.enum(['draft', 'published']),
  published_at: z.string().nullable(),
  hidden: z.boolean(),
  like_count: z.number(),
  updated_at: z.string(),
});

const toPost = (row: z.output<typeof myPostRow>): MyBlogPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  bodyMd: row.body_md,
  coverPath: row.cover_path,
  coverAlt: row.cover_alt,
  status: row.status,
  publishedAt: row.published_at,
  hidden: row.hidden,
  likeCount: row.like_count,
  updatedAt: row.updated_at,
});

export async function listMyPosts(db: SupabaseClient, userId: string): Promise<MyBlogPost[]> {
  const { data, error } = await db
    .from('blog_posts')
    .select(MY_POST_COLUMNS)
    .eq('author_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Could not load your posts: ${error.message}`);
  return z
    .array(myPostRow)
    .parse(data ?? [])
    .map(toPost);
}

export async function getMyPost(
  db: SupabaseClient,
  userId: string,
  id: string,
): Promise<MyBlogPost | null> {
  const { data, error } = await db
    .from('blog_posts')
    .select(MY_POST_COLUMNS)
    .eq('author_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Could not load your post: ${error.message}`);
  return data ? toPost(myPostRow.parse(data)) : null;
}

export async function insertMyPost(
  db: SupabaseClient,
  userId: string,
  slug: string,
  input: BlogPostInput,
  publishedAt: string | null,
): Promise<MyBlogPost> {
  const { data, error } = await db
    .from('blog_posts')
    .insert({
      author_id: userId,
      slug,
      ...input,
      status: publishedAt ? 'published' : 'draft',
      published_at: publishedAt,
    })
    .select(MY_POST_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toPost(myPostRow.parse(data));
}

export async function updateMyPost(
  db: SupabaseClient,
  userId: string,
  id: string,
  input: BlogPostInput,
  publish: boolean,
  currentPublishedAt: string | null,
): Promise<MyBlogPost> {
  const { data, error } = await db
    .from('blog_posts')
    .update({
      ...input,
      status: publish ? 'published' : 'draft',
      published_at: publish ? (currentPublishedAt ?? new Date().toISOString()) : currentPublishedAt,
    })
    .eq('author_id', userId)
    .eq('id', id)
    .select(MY_POST_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('That post could not be found.');
  return toPost(myPostRow.parse(data));
}

export async function deleteMyPost(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('blog_posts').delete().eq('author_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveMyProfile(
  db: SupabaseClient,
  userId: string,
  input: MemberProfileInput,
): Promise<void> {
  const patch: Record<string, unknown> = { display_name: input.display_name, bio: input.bio };
  if (input.photo_path !== undefined) patch.photo_path = input.photo_path;
  const { error } = await db.from('member_profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}
