'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { Wordmark } from '@/components/brand/logo';
import { AccountMenu, MobileAccountLinks } from '@/components/members/account-menu';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { hasSupabase } from '@/lib/supabase/env';
import { NavLink, RouteChange } from './nav-link';
import { NavDropdown } from './nav-dropdown';
import { CTA_ITEM, NAV_ITEMS, isNavGroup } from './nav-items';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  // While closing, the menu stays mounted so it can fade and slide away before it disappears.
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const closeMenu = useCallback((instant = false) => {
    window.clearTimeout(timer.current);
    if (instant) {
      setOpen(false);
      setClosing(false);
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  // Lock scroll, move focus into the menu, and close on Escape while it is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        openRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur-sm">
        <RouteChange onChange={() => closeMenu(true)} />
        <div className="container-site flex h-[var(--header-h)] items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={`${t.nav.home}`}
            className="-ml-1 inline-flex min-h-11 items-center px-1"
          >
            <Wordmark />
          </Link>

          <nav aria-label={t.nav.primary} className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) =>
                isNavGroup(item) ? (
                  <NavDropdown key={item.label} group={item} />
                ) : (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      className="relative inline-flex min-h-11 items-center px-3 text-[0.95rem] text-muted transition-colors hover:text-fg aria-[current=page]:text-fg"
                      activeMark={
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-3 bottom-1.5 h-px bg-signal"
                        />
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ),
              )}
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
            {hasSupabase() ? <AccountMenu /> : null}
            <div className="hidden md:block">
              <Link
                href={CTA_ITEM.href}
                transitionTypes={['nav-forward']}
                className={buttonClass('primary')}
              >
                {CTA_ITEM.label}
              </Link>
            </div>
            <button
              ref={openRef}
              type="button"
              onClick={() => {
                window.clearTimeout(timer.current);
                setClosing(false);
                setOpen(true);
              }}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={t.nav.menu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-sharp border border-line-strong xl:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.menu}
          data-state={closing ? 'closing' : 'open'}
          className="menu-panel fixed inset-0 z-[60] flex flex-col bg-bg"
        >
          <div className="container-site flex h-[var(--header-h)] items-center justify-between border-b border-line">
            <Wordmark />
            <button
              ref={closeRef}
              type="button"
              onClick={() => {
                closeMenu();
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
                <li
                  key={isNavGroup(item) ? item.label : item.href}
                  className="menu-item"
                  style={{ '--i': i } as CSSProperties}
                >
                  {isNavGroup(item) ? (
                    <div className="py-3">
                      <p className="flex min-h-14 items-baseline gap-4 font-display text-3xl tracking-tight">
                        <span aria-hidden="true" className="numeral w-8 text-sm text-muted">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {item.label}
                      </p>
                      <ul aria-label={item.label} className="ml-12 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <NavLink
                              href={child.href}
                              className="flex min-h-11 items-center text-xl text-muted aria-[current=page]:text-fg"
                            >
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <NavLink
                      href={item.href}
                      className="flex min-h-14 items-baseline gap-4 py-3 font-display text-3xl tracking-tight aria-[current=page]:text-fg"
                    >
                      <span aria-hidden="true" className="numeral w-8 text-sm text-muted">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {item.label}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
            {hasSupabase() ? <MobileAccountLinks /> : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
