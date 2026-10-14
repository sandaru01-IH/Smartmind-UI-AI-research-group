import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseEnv } from './env';

/**
 * Stateless anonymous client for public reads. It carries no cookies, so results are safe to cache
 * and Row Level Security applies the anonymous policy.
 */
export function createPublicClient(): SupabaseClient | null {
  const env = supabaseEnv();
  if (!env) return null;
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
