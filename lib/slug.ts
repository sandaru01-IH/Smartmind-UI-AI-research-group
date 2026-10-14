export const SLUG_MAX = 80;
export const RESERVED_SLUGS: ReadonlySet<string> = new Set(['admin', 'api', 'new', 'feed', 'rss']);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX && SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);
}

/** Lowercase ASCII, hyphen separated, at most SLUG_MAX characters. */
export function slugify(input: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'"“”]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cut = ascii.slice(0, SLUG_MAX).replace(/-+$/g, '');
  return cut || 'post';
}

/** Returns `base`, or `base-2`, `base-3`, … until the slug is free and not reserved. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const free = (s: string) => !taken.has(s) && !RESERVED_SLUGS.has(s);
  if (free(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (free(candidate)) return candidate;
  }
}
