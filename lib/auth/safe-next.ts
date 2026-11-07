/** Only follow redirect targets that stay inside /admin. Anything else falls back to /admin. */
export function safeNext(value: string | null | undefined): string {
  const fallback = '/admin';
  if (!value || value.length > 300) return fallback;
  // Browsers drop tab/newline/CR while parsing a URL, so '/\t/host' would become '//host'.
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;
  if (!value.startsWith('/admin')) return fallback;
  if (value.startsWith('//') || value.includes('\\') || value.includes('..')) return fallback;
  if (value !== '/admin' && !/^\/admin[/?#]/.test(value)) return fallback;
  // Parse it the way a browser would: it must stay on this origin and come back unchanged.
  const url = new URL(value, 'http://x');
  if (url.origin !== 'http://x' || url.pathname + url.search + url.hash !== value) return fallback;
  return value;
}
