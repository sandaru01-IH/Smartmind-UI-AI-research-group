import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSessionClient } from '@/lib/supabase/server-client';

const TYPES: readonly EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink'];

/**
 * The page the emailed links open. It trades the one-use token in the link for a session, then sends
 * the person on: to the password form after a reset link, to the login page after confirming an email.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');
  const failed = NextResponse.redirect(new URL('/login?error=confirm', url.origin));

  const supabase = await createSessionClient();
  if (!supabase) return failed;

  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failed;
    if (type === 'recovery') return NextResponse.redirect(new URL('/reset-password', url.origin));
    // The person confirmed their email; make them log in once so the browser holds a fresh session.
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?verified=1', url.origin));
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed;
    return NextResponse.redirect(new URL('/reset-password', url.origin));
  }
  return failed;
}
