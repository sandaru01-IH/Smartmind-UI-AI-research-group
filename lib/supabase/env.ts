/** Public Supabase settings. Safe for the browser. The service-role key is never read here. */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export const hasSupabase = (): boolean => supabaseEnv() !== null;

export const MEDIA_BUCKET = 'media';

/** Public URL of a stored cover image, or null when Supabase is not configured. */
export function mediaUrl(path: string | null | undefined): string | null {
  const env = supabaseEnv();
  if (!env || !path) return null;
  return `${env.url.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}
