import { finalizeUploadAction, requestUploadAction } from '@/app/admin/actions';
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/schemas';
import { createUploadClient } from '@/lib/supabase/browser-client';

export type UploadResult = { ok: true; path: string } | { ok: false; message: string };

/** Browser side of the two-step upload: signed URL from the server, direct upload, server-side verification. */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return { ok: false, message: 'Use a JPEG, PNG or WebP image.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: 'Images must be 5 MB or smaller.' };
  try {
    const req = await requestUploadAction({ type: file.type, size: file.size });
    if (!req.ok) return { ok: false, message: req.message };
    const client = createUploadClient();
    if (!client) return { ok: false, message: 'Storage is not configured.' };
    const up = await client.storage
      .from('media')
      .uploadToSignedUrl(req.data.path, req.data.token, file, { contentType: file.type });
    if (up.error) return { ok: false, message: 'The upload failed. Try again.' };
    const done = await finalizeUploadAction(req.data.path);
    if (!done.ok) return { ok: false, message: done.message };
    return { ok: true, path: done.data.path };
  } catch {
    return { ok: false, message: 'The upload failed. Try again.' };
  }
}
