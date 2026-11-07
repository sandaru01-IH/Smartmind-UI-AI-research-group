import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isRecentRecovery } from '@/lib/auth/recovery-session';

/**
 * The user id when the signed-in session was opened by an emailed link in the last 15 minutes,
 * otherwise null. The token is verified, not just decoded from the cookie.
 */
export async function recentRecoveryUser(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !isRecentRecovery(claims.amr, Math.floor(Date.now() / 1000))) return null;
  return claims.sub;
}
