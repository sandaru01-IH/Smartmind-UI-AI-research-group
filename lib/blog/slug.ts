import { SLUG_MAX, slugify } from '@/lib/slug';

const SUFFIX_LENGTH = 6;

const randomSuffix = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(SUFFIX_LENGTH / 2)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

/**
 * A post address made from its title plus six random characters, so two posts with the same title
 * never collide and a title in Sinhala, Tamil or emoji (which has no letters to turn into a slug)
 * still gets a valid one: `post-3fa9c1`.
 */
export function makeBlogSlug(title: string): string {
  const base = slugify(title)
    .slice(0, SLUG_MAX - SUFFIX_LENGTH - 1)
    .replace(/-+$/g, '');
  return `${base || 'post'}-${randomSuffix()}`;
}
