import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { logoutAction } from '@/app/admin/actions';
import { LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { buttonClass } from '@/components/ui/button';
import { AdminNav } from './admin-nav';
import { ToastProvider } from './toast';

/**
 * Calmer variant of the site shell: no ticker, no footer, one thin bar with the signed-in user.
 * The frame itself needs no data, so it is part of the static shell and paints at once. Only the
 * account line (`account`) and the page (`children`) wait for the session.
 */
export function AdminFrame({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <ToastProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-14 max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-[var(--gutter)] py-1">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2.5 font-display text-lg font-semibold"
          >
            <LogoMark size={24} />
            Smartmind <span className="label-mono text-muted">Admin</span>
          </Link>
          <nav aria-label="Admin" className="flex items-center gap-1">
            <AdminNav />
            <ThemeToggle />
            <form action={logoutAction}>
              <button type="submit" className={buttonClass('ghost', '', 'sm')}>
                <LogOut size={16} aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            </form>
          </nav>
        </div>
        <p className="label-mono mx-auto h-6 max-w-[1200px] px-[var(--gutter)] text-muted">
          {account}
        </p>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-[1200px] px-[var(--gutter)] py-8 outline-none"
      >
        {children}
      </main>
    </ToastProvider>
  );
}
