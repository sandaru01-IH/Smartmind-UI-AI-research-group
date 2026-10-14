import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/components/admin/login-form';
import { SetupScreen } from '@/components/admin/setup-screen';
import { HeroCanvas } from '@/components/hero/hero-canvas';
import { HeroFallback } from '@/components/hero/hero-fallback';
import { LogoMark } from '@/components/brand/logo';
import { safeNext } from '@/lib/auth/safe-next';
import { hasSupabase } from '@/lib/supabase/env';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <LoginForm next={safeNext(first(sp.next))} expired={first(sp.expired) === '1'} />;
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  if (!hasSupabase()) return <SetupScreen />;
  return (
    <main
      id="main"
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-[var(--gutter)] py-12"
    >
      <div className="absolute inset-0 -z-10 opacity-60" aria-hidden="true">
        <HeroFallback />
        <div className="absolute inset-0">
          <HeroCanvas />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, color-mix(in oklab, var(--bg) 85%, transparent) 0%, var(--bg) 85%)',
          }}
        />
      </div>
      <div className="w-full max-w-sm border border-line-strong bg-bg/90 p-6 backdrop-blur-sm sm:p-8">
        <p className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <LogoMark size={24} /> Smartmind
        </p>
        <h1 className="mt-6 text-3xl">Admin sign-in</h1>
        <p className="mt-2 text-[0.95rem] text-muted">
          For the team that publishes news. There is no public sign-up.
        </p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-64" aria-busy="true" />}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-[0.95rem] text-muted underline underline-offset-4 hover:text-fg"
          >
            Back to the site
          </Link>
        </p>
      </div>
    </main>
  );
}
