import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify, uniqueSlug } from '@/lib/slug';
import { publicState } from '@/lib/visibility';
import { parsePostRow, parsePostRows, POST_COLUMNS } from './rows';
import { applyAdminQuery } from './query';
import type { AdminListQuery, Post } from './types';
import type { PostInput } from '@/lib/schemas';

/** Admin data access. Callers pass the session client from requireAdmin(); RLS enforces the rest. */

export async function adminList(db: SupabaseClient, query: AdminListQuery = {}): Promise<Post[]> {
  const { data, error } = await db.from('posts').select(POST_COLUMNS).order('updated_at', { ascending: false }).limit(500);
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return applyAdminQuery(parsePostRows(data), query);
}

export async function adminGet(db: SupabaseClient, id: string): Promise<Post | null> {
  const { data, error } = await db.from('posts').select(POST_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load post: ${error.message}`);
  return parsePostRow(data);
}

export interface AdminStats {
  published: number;
  scheduled: number;
  drafts: number;
  lastUpdated: string | null;
}

export async function adminStats(db: SupabaseClient): Promise<AdminStats> {
  const posts = await adminList(db);
  const now = new Date();
  const count = (s: 'live' | 'scheduled' | 'draft') => posts.filter((p) => publicState(p, now) === s).length;
  return {
    published: count('live'),
    scheduled: count('scheduled'),
    drafts: count('draft'),
    lastUpdated: posts.reduce<string | null>((latest, p) => (!latest || p.updated_at > latest ? p.updated_at : latest), null),
  };
}

export async function takenSlugs(db: SupabaseClient, base: string, excludeId?: string): Promise<Set<string>> {
  let q = db.from('posts').select('slug,id').ilike('slug', `${base.replace(/[%_]/g, '')}%`).limit(200);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`Could not check slugs: ${error.message}`);
  return new Set((data ?? []).map((r: { slug: string }) => r.slug));
}

export async function slugIsTaken(db: SupabaseClient, slug: string, excludeId?: string): Promise<boolean> {
  return (await takenSlugs(db, slug, excludeId)).has(slug);
}

export async function freshSlug(db: SupabaseClient, title: string): Promise<string> {
  const base = slugify(title);
  return uniqueSlug(base, await takenSlugs(db, base));
}

export async function insertPost(db: SupabaseClient, values: PostInput, authorId: string): Promise<Post> {
  const { data, error } = await db
    .from('posts')
    .insert({ ...values, author_id: authorId })
    .select(POST_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return parsePostRows([data])[0];
}

export async function updatePostRow(db: SupabaseClient, id: string, values: Partial<PostInput>): Promise<Post> {
  const { data, error } = await db.from('posts').update(values).eq('id', id).select(POST_COLUMNS).single();
  if (error) throw new Error(error.message);
  return parsePostRows([data])[0];
}

export async function deletePostRow(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
