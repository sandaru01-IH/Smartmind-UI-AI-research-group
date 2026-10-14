import { describe, expect, it } from 'vitest';
import { sniffImageType, validateImage, extensionFor } from './image';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const html = new TextEncoder().encode('<script>alert(1)</script>');

describe('sniffImageType', () => {
  it('recognises jpeg, png and webp by magic bytes', () => {
    expect(sniffImageType(jpeg)).toBe('image/jpeg');
    expect(sniffImageType(png)).toBe('image/png');
    expect(sniffImageType(webp)).toBe('image/webp');
  });
  it('returns null for anything else', () => {
    expect(sniffImageType(html)).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe('validateImage', () => {
  it('accepts a matching declared type', () => {
    expect(validateImage({ declaredType: 'image/png', bytes: png })).toEqual({
      ok: true,
      type: 'image/png',
    });
  });
  it('rejects content that disguises itself with an image MIME type', () => {
    const r = validateImage({ declaredType: 'image/png', bytes: html });
    expect(r.ok).toBe(false);
  });
  it('rejects a declared type that disagrees with the bytes', () => {
    expect(validateImage({ declaredType: 'image/jpeg', bytes: png }).ok).toBe(false);
  });
  it('rejects SVG and GIF', () => {
    expect(validateImage({ declaredType: 'image/svg+xml', bytes: html }).ok).toBe(false);
    expect(
      validateImage({ declaredType: 'image/gif', bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38]) })
        .ok,
    ).toBe(false);
  });
  it('rejects files over 5 MB', () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(png);
    expect(validateImage({ declaredType: 'image/png', bytes: big }).ok).toBe(false);
  });
  it('rejects empty files', () => {
    expect(validateImage({ declaredType: 'image/png', bytes: new Uint8Array() }).ok).toBe(false);
  });
});

describe('extensionFor', () => {
  it('maps types to extensions', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(extensionFor('image/png')).toBe('png');
    expect(extensionFor('image/webp')).toBe('webp');
  });
});
