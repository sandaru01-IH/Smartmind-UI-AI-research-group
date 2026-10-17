import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSessionClient } from '@/lib/supabase/server-client';

export interface AdminContext {
  supabase: SupabaseClient;
  user: { id: string; email: string };
}

/**
 * The signed-in admin, or null. The session token is verified (its signature is checked locally when
 * the project signs with asymmetric keys, otherwise by Supabase Auth), never just decoded from the
 * cookie, and the profile must carry role = 'admin'.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) return null;
  const profile = await supabase.from('profiles').select('role').eq('id', id).maybeSingle();
  if (profile.error || profile.data?.role !== 'admin') return null;
  const email = data.claims.email;
  return { supabase, user: { id, email: typeof email === 'string' ? email : '' } };
});

/** Call first in every admin page, server action and route handler. Redirects when not an admin. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
