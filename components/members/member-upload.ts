import { finalizeMemberUploadAction, requestMemberUploadAction } from '@/app/blog-actions';
import type { UploadResult } from '@/components/admin/upload-client';
import { t } from '@/content/strings';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/schemas';
import { createUploadClient } from '@/lib/supabase/browser-client';
import { mediaUrl } from '@/lib/supabase/env';

/**
 * Browser side of a member's image upload: a one-use signed URL from the server (inside the member's
 * own folder), a direct upload, then the server checks the stored bytes. `url` is the public address
 * to link the image from a post.
 */
export async function uploadMemberImage(file: File): Promise<UploadResult & { url?: string }> {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return { ok: false, message: t.blog.imageRules };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: t.blog.imageRules };
  try {
    const req = await requestMemberUploadAction({ type: file.type, size: file.size });
    if (!req.ok) return { ok: false, message: req.message };
    const client = createUploadClient();
    if (!client) return { ok: false, message: t.blog.uploadFailed };
    const up = await client.storage
      .from('media')
      .uploadToSignedUrl(req.data.path, req.data.token, file, { contentType: file.type });
    if (up.error) return { ok: false, message: t.blog.uploadFailed };
    const done = await finalizeMemberUploadAction(req.data.path);
    if (!done.ok) return { ok: false, message: done.message };
    return { ok: true, path: done.data.path, url: mediaUrl(done.data.path) ?? undefined };
  } catch {
    return { ok: false, message: t.blog.uploadFailed };
  }
}
