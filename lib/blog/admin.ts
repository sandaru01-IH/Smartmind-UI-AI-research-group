import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { FORMER_MEMBER_NAME } from './rows';

/**
 * Admin moderation reads. Callers pass the session client from requireAdmin(); Row Level Security
 * lets an admin read every post, comment and member. There are no writers here: the admin can only
 * hide and block, through the admin_set_* functions, never edit what someone wrote.
 */

export interface AdminPost {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
  hidden: boolean;
  likeCount: number;
  createdAt: string;
  authorId: string | null;
  authorName: string;
  authorBlocked: boolean;
}

export interface AdminComment {
  id: string;
  body: string;
  hidden: boolean;
  createdAt: string;
  postId: string | null;
  postSlug: string | null;
  postTitle: string | null;
  authorName: string;
}

export interface AdminMember {
  id: string;
  email: string;
  displayName: string;
  blocked: boolean;
  createdAt: string;
}

const postRow = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'published']),
  published_at: z.string().nullable(),
  hidden: z.boolean(),
  like_count: z.number(),
  created_at: z.string(),
  author: z.object({ id: z.string(), display_name: z.string(), blocked: z.boolean() }).nullable(),
});

export const parseAdminPosts = (rows: unknown): AdminPost[] =>
  z
    .array(postRow)
    .parse(rows ?? [])
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      publishedAt: r.published_at,
      hidden: r.hidden,
      likeCount: r.like_count,
      createdAt: r.created_at,
      authorId: r.author?.id ?? null,
      authorName: r.author?.display_name ?? FORMER_MEMBER_NAME,
      authorBlocked: r.author?.blocked ?? false,
    }));

const commentRow = z.object({
  id: z.string(),
  body: z.string(),
  hidden: z.boolean(),
  created_at: z.string(),
  post: z.object({ id: z.string(), slug: z.string(), title: z.string() }).nullable(),
  author: z.object({ id: z.string(), display_name: z.string() }).nullable(),
});

export const parseAdminComments = (rows: unknown): AdminComment[] =>
  z
    .array(commentRow)
    .parse(rows ?? [])
    .map((r) => ({
      id: r.id,
      body: r.body,
      hidden: r.hidden,
      createdAt: r.created_at,
      postId: r.post?.id ?? null,
      postSlug: r.post?.slug ?? null,
      postTitle: r.post?.title ?? null,
      authorName: r.author?.display_name ?? FORMER_MEMBER_NAME,
    }));

const memberRow = z.object({
  id: z.string(),
  email: z.string(),
  display_name: z.string(),
  blocked: z.boolean(),
  created_at: z.string(),
});

export const parseAdminMembers = (rows: unknown): AdminMember[] =>
  z
    .array(memberRow)
    .parse(rows ?? [])
    .map((r) => ({
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      blocked: r.blocked,
      createdAt: r.created_at,
    }));

const missing = (message: string) =>
  /does not exist|schema cache|Could not find the function/i.test(message);

export async function adminBlogPosts(db: SupabaseClient): Promise<AdminPost[]> {
  const { data, error } = await db
    .from('blog_posts')
    .select(
      'id,slug,title,status,published_at,hidden,like_count,created_at,author:member_profiles!author_id(id,display_name,blocked)',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error && missing(error.message)) return [];
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return parseAdminPosts(data);
}

export async function adminBlogComments(db: SupabaseClient): Promise<AdminComment[]> {
  const { data, error } = await db
    .from('blog_comments')
    .select(
      'id,body,hidden,created_at,post:blog_posts(id,slug,title),author:member_profiles!author_id(id,display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (error && missing(error.message)) return [];
  if (error) throw new Error(`Could not load comments: ${error.message}`);
  return parseAdminComments(data);
}

export async function adminMembers(db: SupabaseClient): Promise<AdminMember[]> {
  const { data, error } = await db.rpc('admin_list_members');
  if (error && missing(error.message)) return [];
  if (error) throw new Error(`Could not load members: ${error.message}`);
  return parseAdminMembers(data);
}

/** The slugs of every post a member wrote, so their cached pages can be refreshed when they are blocked. */
export async function slugsOfMember(db: SupabaseClient, memberId: string): Promise<string[]> {
  const { data } = await db.from('blog_posts').select('slug').eq('author_id', memberId);
  return (data ?? []).map((r) => String(r.slug));
}

export async function slugOfPost(db: SupabaseClient, postId: string): Promise<string | null> {
  const { data } = await db.from('blog_posts').select('slug').eq('id', postId).maybeSingle();
  return data ? String(data.slug) : null;
}

export async function slugOfComment(db: SupabaseClient, commentId: string): Promise<string | null> {
  const { data } = await db
    .from('blog_comments')
    .select('post:blog_posts(slug)')
    .eq('id', commentId)
    .maybeSingle();
  const post = (data as { post?: { slug?: string } | null } | null)?.post;
  return post?.slug ?? null;
}
