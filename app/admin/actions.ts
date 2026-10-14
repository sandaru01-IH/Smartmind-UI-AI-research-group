'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { safeNext } from '@/lib/auth/safe-next';
import { loginThrottle } from '@/lib/auth/throttle';
import { extensionFor, sniffImageType, validateImage } from '@/lib/image';
import {
  adminGet,
  deletePostRow,
  freshSlug,
  insertPost,
  slugIsTaken,
  updatePostRow,
} from '@/lib/posts/admin';
import type { Post } from '@/lib/posts/types';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  loginSchema,
  postInputSchema,
  quickUpdateSchema,
  type PostInput,
} from '@/lib/schemas';
import { MEDIA_BUCKET } from '@/lib/supabase/env';
import { createSessionClient } from '@/lib/supabase/server-client';
import { isValidUploadPath, newUploadPath } from '@/lib/upload-path';
import { resolvePublishedAt } from '@/lib/visibility';

/* ----------------------------------------------------------------- helpers */

/** Expire every cached public view of posts, immediately. Server Actions only. */
function refreshPublic(slugs: string[] = []): void {
  updateTag('posts');
  updateTag('latest');
  for (const slug of new Set(slugs)) updateTag(`post:${slug}`);
  revalidatePath('/');
  revalidatePath('/news');
  revalidatePath('/sitemap.xml');
  for (const slug of new Set(slugs)) revalidatePath(`/news/${slug}`);
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const fail = (message: string, fieldErrors?: Record<string, string[]>) =>
  ({ ok: false, message, fieldErrors }) as const;

const GENERIC_LOGIN_ERROR = 'The email or password is not correct.';

/* -------------------------------------------------------------------- auth */

export interface LoginState {
  error?: string;
  retryAfter?: number;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: GENERIC_LOGIN_ERROR };

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const key = `${ip}|${parsed.data.email}`;
  const state = loginThrottle.check(key);
  if (state.locked) {
    return {
      error: `Too many attempts. Try again in ${Math.ceil(state.retryAfterSeconds / 60)} minutes.`,
      retryAfter: state.retryAfterSeconds,
    };
  }

  const supabase = await createSessionClient();
  if (!supabase) return { error: 'Sign-in is not available.' };

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    loginThrottle.fail(key);
    return { error: GENERIC_LOGIN_ERROR };
  }
  const profile = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile.error || profile.data?.role !== 'admin') {
    await supabase.auth.signOut();
    loginThrottle.fail(key);
    return { error: GENERIC_LOGIN_ERROR };
  }

  loginThrottle.reset(key);
  redirect(safeNext(String(formData.get('next') ?? '')));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect('/admin/login');
}

/* ------------------------------------------------------------------- posts */

export interface SaveInput {
  id: string | null;
  values: unknown;
}

export async function savePostAction({ id, values }: SaveInput): Promise<ActionResult<Post>> {
  const { supabase, user } = await requireAdmin();
  const parsed = postInputSchema.safeParse(values);
  if (!parsed.success) {
    return fail('Fix the highlighted fields.', z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
  }
  const input: PostInput = {
    ...parsed.data,
    published_at: resolvePublishedAt(parsed.data.status, parsed.data.published_at),
  };

  try {
    if (await slugIsTaken(supabase, input.slug, id ?? undefined)) {
      return fail('That slug is already used.', { slug: ['That slug is already used'] });
    }
    const before = id ? await adminGet(supabase, id) : null;
    const saved = id ? await updatePostRow(supabase, id, input) : await insertPost(supabase, input, user.id);
    refreshPublic([saved.slug, before?.slug ?? saved.slug]);
    return { ok: true, data: saved };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not save the post.');
  }
}

export async function quickUpdateAction(
  _prev: { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }> {
  const { supabase, user } = await requireAdmin();
  const parsed = quickUpdateSchema.safeParse({
    title: formData.get('title'),
    category: formData.get('category') || 'News',
    link_url: formData.get('link_url'),
    cover_path: formData.get('cover_path'),
    cover_alt: formData.get('cover_alt'),
  });
  if (!parsed.success) {
    return { error: 'Check the headline and link.', fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  const q = parsed.data;
  if (q.cover_path && !isValidUploadPath(q.cover_path)) return { error: 'The image upload is not valid.' };
  if (q.cover_path && !q.cover_alt) return { error: 'Describe the image for screen readers.', fieldErrors: { cover_alt: ['Required'] } };

  try {
    const slug = await freshSlug(supabase, q.title);
    const input = postInputSchema.parse({
      type: 'update',
      title: q.title,
      slug,
      excerpt: '',
      body_md: '',
      category: q.category,
      tags: [],
      cover_path: q.cover_path,
      cover_alt: q.cover_alt,
      link_url: q.link_url,
      status: 'published',
      published_at: new Date().toISOString(),
    });
    const saved = await insertPost(supabase, input, user.id);
    refreshPublic([saved.slug]);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not publish the update.' };
  }
}

export async function setPublishedAction(id: string, publish: boolean): Promise<ActionResult<Post>> {
  const { supabase } = await requireAdmin();
  const idOk = z.uuid().safeParse(id);
  if (!idOk.success) return fail('Unknown post.');
  try {
    const post = await adminGet(supabase, id);
    if (!post) return fail('That post no longer exists.');
    const saved = await updatePostRow(supabase, id, {
      status: publish ? 'published' : 'draft',
      published_at: publish ? resolvePublishedAt('published', post.published_at) : post.published_at,
    });
    refreshPublic([saved.slug]);
    return { ok: true, data: saved };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not change the status.');
  }
}

export async function duplicatePostAction(id: string): Promise<ActionResult<Post>> {
  const { supabase, user } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown post.');
  try {
    const post = await adminGet(supabase, id);
    if (!post) return fail('That post no longer exists.');
    const title = `${post.title} (copy)`.slice(0, post.type === 'update' ? 140 : 160);
    const copy = await insertPost(
      supabase,
      postInputSchema.parse({
        ...post,
        title,
        slug: await freshSlug(supabase, title),
        featured: false,
        status: 'draft',
        published_at: null,
      }),
      user.id,
    );
    return { ok: true, data: copy };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not duplicate the post.');
  }
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown post.');
  try {
    const post = await adminGet(supabase, id);
    if (!post) return { ok: true };
    await deletePostRow(supabase, id);
    refreshPublic([post.slug]);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not delete the post.');
  }
}

/* ------------------------------------------------------------------ uploads */

const uploadRequest = z.object({
  type: z.enum(IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
});

/** Step 1: the server picks the storage path and hands the browser a one-use signed upload URL. */
export async function requestUploadAction(input: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  const { supabase } = await requireAdmin();
  const parsed = uploadRequest.safeParse(input);
  if (!parsed.success) return fail('Use a JPEG, PNG or WebP image of 5 MB or less.');
  const path = newUploadPath(parsed.data.type);
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail('Could not start the upload.');
  return { ok: true, data: { path, token: data.token } };
}

/** Step 2: the server reads the stored file back and checks its real type and size. Bad files are deleted. */
export async function finalizeUploadAction(path: string): Promise<ActionResult<{ path: string }>> {
  const { supabase } = await requireAdmin();
  if (!isValidUploadPath(path)) return fail('Unknown file.');
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return fail('The upload did not arrive. Try again.');
  const bytes = new Uint8Array(await data.arrayBuffer());
  const declared = sniffImageType(bytes);
  const check = validateImage({ declaredType: declared ?? 'unknown', bytes });
  if (!check.ok) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail(check.error);
  }
  if (extensionFor(check.type) !== path.split('.').pop()) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return fail('The file type does not match what was requested.');
  }
  return { ok: true, data: { path } };
}
