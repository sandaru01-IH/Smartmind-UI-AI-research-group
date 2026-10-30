'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { slugOfComment, slugOfPost, slugsOfMember } from '@/lib/blog/admin';
import type { ActionResult } from './actions';

const fail = (message: string) => ({ ok: false, message }) as const;
const uuid = z.uuid();

/** Expires everything the public sees of community writing, and of each named post. */
function refreshPublic(slugs: (string | null)[]): void {
  updateTag('blog');
  for (const slug of slugs) if (slug) updateTag(`blog:${slug}`);
  revalidatePath('/blog');
  revalidatePath('/');
}

/**
 * The admin can only hide or show, and block or unblock. These call the database's admin functions,
 * which refuse anyone who is not an admin and change nothing but the visibility flag.
 */
export async function setBlogPostHiddenAction(id: string, hidden: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success || typeof hidden !== 'boolean') return fail('Unknown post.');
  const slug = await slugOfPost(supabase, id);
  const { error } = await supabase.rpc('admin_set_blog_post_hidden', {
    p_id: id,
    p_hidden: hidden,
  });
  if (error) return fail(error.message);
  refreshPublic([slug]);
  return { ok: true };
}

export async function setBlogCommentHiddenAction(
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success || typeof hidden !== 'boolean') return fail('Unknown comment.');
  const slug = await slugOfComment(supabase, id);
  const { error } = await supabase.rpc('admin_set_blog_comment_hidden', {
    p_id: id,
    p_hidden: hidden,
  });
  if (error) return fail(error.message);
  refreshPublic([slug]);
  return { ok: true };
}

export async function setMemberBlockedAction(id: string, blocked: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success || typeof blocked !== 'boolean') return fail('Unknown member.');
  const slugs = await slugsOfMember(supabase, id);
  const { error } = await supabase.rpc('admin_set_member_blocked', {
    p_id: id,
    p_blocked: blocked,
  });
  if (error) return fail(error.message);
  refreshPublic(slugs);
  return { ok: true };
}
