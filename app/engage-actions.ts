'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { t } from '@/content/strings';
import { commentInputSchema } from '@/lib/blog/engage';
import { getMember, type MemberContext } from '@/lib/members/session';
import type { ActionResult } from './admin/actions';

const fail = (message: string) => ({ ok: false, message }) as const;
type Failure = ReturnType<typeof fail>;

/** The member, if they may comment and like: signed in, email confirmed, not blocked. */
async function engager(): Promise<MemberContext | Failure> {
  const member = await getMember();
  if (!member) return fail(t.blog.needLogin);
  if (member.profile.blocked) return fail(t.blog.blocked);
  if (!member.verified) return fail(t.blog.needVerifyShort);
  return member;
}
const isFailure = (v: MemberContext | Failure): v is Failure => 'ok' in v;

/** The slug of a live post, for expiring its cache tag. The database only returns posts the public can see. */
async function liveSlug(member: MemberContext, postId: string): Promise<string | null> {
  const { data } = await member.supabase
    .from('blog_posts')
    .select('slug')
    .eq('id', postId)
    .eq('status', 'published')
    .eq('hidden', false)
    .maybeSingle();
  return data ? String(data.slug) : null;
}

function refreshPost(slug: string): void {
  updateTag('blog');
  updateTag(`blog:${slug}`);
  revalidatePath(`/blog/${slug}`);
}

export async function addCommentAction(postId: string, body: string): Promise<ActionResult> {
  const who = await engager();
  if (isFailure(who)) return who;
  if (!z.uuid().safeParse(postId).success) return fail(t.blog.unknownPost);
  const parsed = commentInputSchema.safeParse({ body });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? t.blog.commentFailed);
  const slug = await liveSlug(who, postId);
  if (!slug) return fail(t.blog.unknownPost);
  const { error } = await who.supabase
    .from('blog_comments')
    .insert({ post_id: postId, author_id: who.user.id, body: parsed.data.body });
  if (error) return fail(/too fast/i.test(error.message) ? error.message : t.blog.commentFailed);
  refreshPost(slug);
  return { ok: true };
}

/** Deletes a comment: its writer or the author of the post may (Row Level Security enforces who). */
export async function deleteCommentAction(commentId: string, slug: string): Promise<ActionResult> {
  const member = await getMember();
  if (!member) return fail(t.blog.needLogin);
  if (!z.uuid().safeParse(commentId).success) return fail(t.blog.commentFailed);
  const { error } = await member.supabase.from('blog_comments').delete().eq('id', commentId);
  if (error) return fail(t.blog.commentFailed);
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) refreshPost(slug);
  return { ok: true };
}

/** Likes the post, or removes the like when there already is one. Returns the new state. */
export async function toggleLikeAction(
  postId: string,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const who = await engager();
  if (isFailure(who)) return who;
  if (!z.uuid().safeParse(postId).success) return fail(t.blog.unknownPost);
  const slug = await liveSlug(who, postId);
  if (!slug) return fail(t.blog.unknownPost);

  const existing = await who.supabase
    .from('blog_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', who.user.id)
    .maybeSingle();
  const op = existing.data
    ? await who.supabase
        .from('blog_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', who.user.id)
    : await who.supabase.from('blog_likes').insert({ post_id: postId, user_id: who.user.id });
  // A double click can race a second insert past the first; the primary key makes it a harmless no-op.
  if (op.error && op.error.code !== '23505') return fail(t.blog.likeFailed);

  const { data } = await who.supabase
    .from('blog_posts')
    .select('like_count')
    .eq('id', postId)
    .single();
  refreshPost(slug);
  return {
    ok: true,
    data: { liked: !existing.data, likeCount: Number(data?.like_count ?? 0) },
  };
}
