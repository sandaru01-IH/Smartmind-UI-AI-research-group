/** Only follow redirect targets that stay inside /admin. Anything else falls back to /admin. */
export function safeNext(value: string | null | undefined): string {
  const fallback = '/admin';
  if (!value || value.length > 300) return fallback;
  if (!value.startsWith('/admin')) return fallback;
  if (value.startsWith('//') || value.includes('\\') || value.includes('..')) return fallback;
  if (value !== '/admin' && !/^\/admin[/?#]/.test(value)) return fallback;
  return value;
}
