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
 * The signed-in admin, or null. The user is verified with Supabase Auth (not just decoded from the
 * cookie), and the profile must carry role = 'admin'.
 */
export const getAdmin = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const profile = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile.error || profile.data?.role !== 'admin') return null;
  return { supabase, user: { id: data.user.id, email: data.user.email ?? '' } };
});

/** Call first in every admin page, server action and route handler. Redirects when not an admin. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
