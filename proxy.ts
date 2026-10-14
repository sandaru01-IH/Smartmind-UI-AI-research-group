import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseEnv } from '@/lib/supabase/env';

/**
 * First line of defence for /admin/*: no valid Supabase session, no entry. It also refreshes the
 * session cookies. It does not decide who is an admin. Every page, server action and route handler
 * calls requireAdmin() itself (lib/auth/require-admin.ts), and Row Level Security enforces the same
 * rule in Postgres.
 */
export async function proxy(request: NextRequest) {
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
          response.cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure });
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === '/admin/login';

  if (!data.user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    if (request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'))) {
      url.searchParams.set('expired', '1');
    }
    return NextResponse.redirect(url);
  }

  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
