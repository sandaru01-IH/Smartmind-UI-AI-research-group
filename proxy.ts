import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SEED_POSTS } from '@/content/seed-posts';
import { visibleSeedPosts } from '@/lib/posts/query';
import { supabaseEnv } from '@/lib/supabase/env';

/**
 * Unknown /news/<slug> URLs get a real 404 status. The article page streams, so by the time it
 * calls notFound() the 200 status has been sent. A cheap anonymous lookup here fixes the status;
 * Row Level Security makes sure drafts and scheduled posts count as missing.
 */
async function newsSlugExists(slug: string): Promise<boolean> {
  const env = supabaseEnv();
  if (!env) return visibleSeedPosts(SEED_POSTS).some((p) => p.slug === slug);
  try {
    const base = env.url.replace(/\/$/, '');
    const url = `${base}/rest/v1/posts?select=id&status=eq.published&limit=1&slug=eq.${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return true; // On a lookup failure, let the page decide.
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return true;
  }
}

/**
 * First line of defence for /admin/*: no valid Supabase session, no entry. It also refreshes the
 * session cookies for /admin and for the member pages. It does not decide who is an admin. Every page, server action and route handler
 * calls requireAdmin() itself (lib/auth/require-admin.ts), and Row Level Security enforces the same
 * rule in Postgres.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/news/')) {
    let slug = '';
    try {
      slug = decodeURIComponent(request.nextUrl.pathname.slice('/news/'.length));
    } catch {
      // A malformed escape such as /news/%E0%A4%A is simply an unknown article.
      return NextResponse.rewrite(new URL('/_missing-page', request.url), { status: 404 });
    }
    if (slug && !(await newsSlugExists(slug))) {
      return NextResponse.rewrite(new URL('/_missing-page', request.url), { status: 404 });
    }
    return NextResponse.next();
  }

  const env = supabaseEnv();
  // Demo mode: the admin routes render a setup screen instead.
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });
  const secure = process.env.NODE_ENV === 'production';
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'lax',
            secure,
          });
        }
      },
    },
  });

  // Verifies the token (locally when the project uses asymmetric keys) and refreshes the cookies.
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;

  // Member pages (login, writing, account) only need their session cookies kept fresh. They check
  // the signed-in member themselves.
  if (!pathname.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  const isLogin = pathname === '/admin/login';

  if (!data?.claims && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    if (
      request.cookies
        .getAll()
        .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))
    ) {
      url.searchParams.set('expired', '1');
    }
    return NextResponse.redirect(url);
  }

  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/news/:slug',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/write/:path*',
    '/account/:path*',
    '/auth/:path*',
    '/api/me',
  ],
};
