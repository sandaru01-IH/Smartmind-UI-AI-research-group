'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { Wordmark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { CTA_ITEM, NAV_ITEMS } from './nav-items';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  // Close the menu when the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock scroll, move focus into the menu, and close on Escape while it is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        openRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur-sm">
      <div className="container-site flex h-[var(--header-h)] items-center justify-between gap-4">
        <Link href="/" aria-label={`${t.nav.home}`} className="-ml-1 inline-flex min-h-11 items-center px-1">
          <Wordmark />
        </Link>

        <nav aria-label={t.nav.primary} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className="relative inline-flex min-h-11 items-center px-3 text-[0.95rem] text-muted transition-colors hover:text-fg aria-[current=page]:text-fg"
                >
                  {item.label}
                  {isActive(pathname, item.href) ? (
                    <span aria-hidden="true" className="absolute inset-x-3 bottom-1.5 h-px bg-signal" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-palette-open=""
            aria-label={t.palette.open}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-sharp border border-line-strong px-3 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Search size={18} aria-hidden="true" />
            <kbd className="label-mono hidden text-[0.7rem] md:inline">Ctrl K</kbd>
          </button>
          <ThemeToggle />
          <Link href={CTA_ITEM.href} className={buttonClass('primary', 'hidden md:inline-flex')}>
            {CTA_ITEM.label}
          </Link>
          <button
            ref={openRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={t.nav.menu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-sharp border border-line-strong xl:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.menu}
          className="fixed inset-0 z-[60] flex flex-col bg-bg"
        >
          <div className="container-site flex h-[var(--header-h)] items-center justify-between border-b border-line">
            <Wordmark />
            <button
              ref={closeRef}
              type="button"
              onClick={() => {
                setOpen(false);
                openRef.current?.focus();
              }}
              aria-label={t.nav.closeMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-sharp border border-line-strong"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label={t.nav.primary} className="container-site flex-1 overflow-y-auto py-6">
            <ul className="divide-y divide-line">
              {[...NAV_ITEMS, CTA_ITEM].map((item, i) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                    className="flex min-h-14 items-baseline gap-4 py-3 font-display text-3xl tracking-tight aria-[current=page]:text-fg"
                  >
                    <span aria-hidden="true" className="numeral w-8 text-sm text-muted">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
