import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSessionClient } from '@/lib/supabase/server-client';
import { safeMemberNext } from './schema';

export interface MemberContext {
  supabase: SupabaseClient;
  user: { id: string; email: string };
  profile: { displayName: string; bio: string; photoPath: string | null; blocked: boolean };
  /** The email address has been confirmed. */
  verified: boolean;
  /** Verified and not blocked: allowed to write, comment and like. */
  canPost: boolean;
}

/**
 * The signed-in member, or null. The user is checked with Supabase Auth (not just decoded from the
 * cookie). Every account has a member profile; nobody gains admin rights from it.
 */
export const getMember = cache(async (): Promise<MemberContext | null> => {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const profile = await supabase
    .from('member_profiles')
    .select('display_name,bio,photo_path,blocked')
    .eq('id', data.user.id)
    .maybeSingle();
  if (profile.error || !profile.data) return null;
  const verified = Boolean(data.user.email_confirmed_at);
  const blocked = Boolean(profile.data.blocked);
  return {
    supabase,
    user: { id: data.user.id, email: data.user.email ?? '' },
    profile: {
      displayName: String(profile.data.display_name),
      bio: String(profile.data.bio ?? ''),
      photoPath: (profile.data.photo_path as string | null) ?? null,
      blocked,
    },
    verified,
    canPost: verified && !blocked,
  };
});

/** For pages and actions that need a signed-in member. Sends everyone else to the login page. */
export async function requireMember(next: string): Promise<MemberContext> {
  const member = await getMember();
  if (!member) redirect(`/login?next=${encodeURIComponent(safeMemberNext(next))}`);
  return member;
}
