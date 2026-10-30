const WORDS_PER_MINUTE = 200;

/** Whole minutes to read a Markdown body, never less than one. Image links and marks are not words. */
export function readingMinutes(bodyMd: string): number {
  const text = bodyMd
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
