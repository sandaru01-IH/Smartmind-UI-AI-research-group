import { MAX_IMAGE_BYTES } from './schemas';

export type AllowedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Identify an image by its first bytes. The declared MIME type is never trusted on its own. */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export type ImageCheck = { ok: true; type: AllowedImageType } | { ok: false; error: string };

export function validateImage(input: { declaredType: string; bytes: Uint8Array }): ImageCheck {
  const { declaredType, bytes } = input;
  if (bytes.length === 0) return { ok: false, error: 'The file is empty.' };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: 'Images must be 5 MB or smaller.' };
  const sniffed = sniffImageType(bytes);
  if (!sniffed) return { ok: false, error: 'Use a JPEG, PNG or WebP image.' };
  if (declaredType !== sniffed) return { ok: false, error: 'The file type does not match its contents.' };
  return { ok: true, type: sniffed };
}

export function extensionFor(type: AllowedImageType): 'jpg' | 'png' | 'webp' {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
}
