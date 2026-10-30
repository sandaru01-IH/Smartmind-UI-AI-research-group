import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getMember } from '@/lib/members/session';

/**
 * What the post page needs to know about the person looking at it: whether they are signed in, may
 * comment, and have liked this post. Asked from the browser so the post page itself stays cacheable.
 */
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const post = request.nextUrl.searchParams.get('post');
  const member = await getMember();
  if (!member) return NextResponse.json({ signedIn: false }, { headers });
  let liked = false;
  if (post && z.uuid().safeParse(post).success) {
    const { data } = await member.supabase
      .from('blog_likes')
      .select('post_id')
      .eq('post_id', post)
      .eq('user_id', member.user.id)
      .maybeSingle();
    liked = Boolean(data);
  }
  return NextResponse.json(
    {
      signedIn: true,
      memberId: member.user.id,
      canPost: member.canPost,
      verified: member.verified,
      blocked: member.profile.blocked,
      liked,
    },
    { headers },
  );
}
