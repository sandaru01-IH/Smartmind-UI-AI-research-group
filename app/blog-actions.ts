'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { t } from '@/content/strings';
import {
  deleteMyPost,
  getMyPost,
  insertMyPost,
  saveMyProfile,
  updateMyPost,
} from '@/lib/blog/member';
import { blogPostInputSchema, memberProfileSchema } from '@/lib/blog/schema';
import { makeBlogSlug } from '@/lib/blog/slug';
import { extensionFor, sniffImageType, validateImage } from '@/lib/image';
import { getMember, type MemberContext } from '@/lib/members/session';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/schemas';
import { MEDIA_BUCKET } from '@/lib/supabase/env';
import { isValidMemberUploadPath, newMemberUploadPath } from '@/lib/upload-path';
import type { ActionResult } from './admin/actions';

const fail = (message: string, fieldErrors?: Record<string, string[]>) =>
  ({ ok: false, message, fieldErrors }) as const;

/** The member, if they may write: signed in, email confirmed, not blocked. */
type Failure = Extract<ActionResult, { ok: false }>;

async function writer(): Promise<MemberContext | Failure> {
  const member = await getMember();
  if (!member) return fail(t.blog.needLogin);
  if (member.profile.blocked) return fail(t.blog.blocked);
  if (!member.verified) return fail(t.blog.needVerify);
  return member;
}
const isFailure = (v: MemberContext | Failure): v is Failure => 'ok' in v;

function refreshBlog(...slugs: string[]): void {
  updateTag('blog');
  for (const slug of slugs) updateTag(`blog:${slug}`);
  revalidatePath('/blog');
  revalidatePath('/');
}

export interface SavedPost {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
}

/** Saves a draft or publishes. Publishing is immediate; there is no approval step. */
export async function saveBlogPostAction(input: {
  id: string | null;
  values: unknown;
  publish: boolean;
}): Promise<ActionResult<SavedPost>> {
  const who = await writer();
  if (isFailure(who)) return who;
  const id = z.uuid().nullable().safeParse(input.id);
  if (!id.success) return fail(t.blog.unknownPost);
  const parsed = blogPostInputSchema.safeParse(input.values);
  if (!parsed.success) {
    return fail(
      t.members.fixFields,
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const { cover_path } = parsed.data;
  if (cover_path && !isValidMemberUploadPath(cover_path, who.user.id)) {
    return fail(t.blog.badUpload, { cover_path: [t.blog.badUpload] });
  }

  try {
    const existing = id.data ? await getMyPost(who.supabase, who.user.id, id.data) : null;
    if (id.data && !existing) return fail(t.blog.unknownPost);
    const saved = existing
      ? await updateMyPost(
          who.supabase,
          who.user.id,
          existing.id,
          parsed.data,
          input.publish,
          existing.publishedAt,
        )
      : await insertMyPost(
          who.supabase,
          who.user.id,
          makeBlogSlug(parsed.data.title),
          parsed.data,
          input.publish ? new Date().toISOString() : null,
        );
    refreshBlog(saved.slug);
    return {
      ok: true,
      data: {
        id: saved.id,
        slug: saved.slug,
        status: saved.status,
        publishedAt: saved.publishedAt,
      },
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : t.blog.saveFailed);
  }
}

export async function deleteBlogPostAction(id: string): Promise<ActionResult> {
  const who = await writer();
  if (isFailure(who)) return who;
  if (!z.uuid().safeParse(id).success) return fail(t.blog.unknownPost);
  try {
    const existing = await getMyPost(who.supabase, who.user.id, id);
    if (!existing) return { ok: true };
    await deleteMyPost(who.supabase, who.user.id, id);
    refreshBlog(existing.slug);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : t.blog.deleteFailed);
  }
}

export async function saveProfileAction(values: unknown): Promise<ActionResult> {
  const member = await getMember();
  if (!member) return fail(t.blog.needLogin);
  const parsed = memberProfileSchema.safeParse(values);
  if (!parsed.success) {
    return fail(
      t.members.fixFields,
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  const photo = parsed.data.photo_path;
  if (photo && !isValidMemberUploadPath(photo, member.user.id)) return fail(t.blog.badUpload);
  try {
    await saveMyProfile(member.supabase, member.user.id, parsed.data);
    revalidatePath('/blog');
    updateTag('blog');
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : t.blog.saveFailed);
  }
}

/* ------------------------------------------------------------------ uploads */

const uploadRequest = z.object({
  type: z.enum(IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

/** Step 1: the server picks a path inside the member's own folder and issues a one-use upload URL. */
export async function requestMemberUploadAction(
  input: unknown,
): Promise<ActionResult<{ path: string; token: string }>> {
  const who = await writer();
  if (isFailure(who)) return who;
  const parsed = uploadRequest.safeParse(input);
  if (!parsed.success) return fail(t.blog.imageRules);
  const path = newMemberUploadPath(who.user.id, parsed.data.type);
  const { data, error } = await who.supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail(t.blog.uploadFailed);
  return { ok: true, data: { path, token: data.token } };
}

/** Step 2: the server reads the stored file back and checks its real type and size. Bad files are deleted. */
export async function finalizeMemberUploadAction(
  path: string,
): Promise<ActionResult<{ path: string }>> {
  const who = await writer();
  if (isFailure(who)) return who;
  if (!isValidMemberUploadPath(path, who.user.id)) return fail(t.blog.badUpload);
  const { data, error } = await who.supabase.storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return fail(t.blog.uploadFailed);
  const bytes = new Uint8Array(await data.arrayBuffer());
  const check = validateImage({ declaredType: sniffImageType(bytes) ?? 'unknown', bytes });
  if (!check.ok) {
    await who.supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail(check.error);
  }
  if (extensionFor(check.type) !== path.split('.').pop()) {
    await who.supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail(t.blog.badUpload);
  }
  return { ok: true, data: { path } };
}
