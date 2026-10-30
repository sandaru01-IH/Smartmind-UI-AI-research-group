import { NextResponse } from 'next/server';
import { getMember } from '@/lib/members/session';
import { mediaUrl } from '@/lib/supabase/env';

/**
 * Who is signed in, for the header's account menu. The public pages stay cacheable because the menu
 * asks this route from the browser instead of reading the session while rendering.
 */
export async function GET() {
  const member = await getMember();
  const body = member
    ? {
        signedIn: true,
        name: member.profile.displayName,
        photoUrl: mediaUrl(member.profile.photoPath),
        canPost: member.canPost,
        verified: member.verified,
      }
    : { signedIn: false };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
}
