'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Session-less browser client. Used only to PUT a file to a one-use signed upload URL. */
export function createUploadClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
