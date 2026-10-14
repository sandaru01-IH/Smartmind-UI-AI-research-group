import { Suspense, type ReactNode } from 'react';
import { LazyCommandPalette } from '@/components/palette/lazy-command-palette';
import { t } from '@/content/strings';
import { SiteFooter } from './site-footer';
import { PAGE_INDEX } from './nav-items';
import { SiteHeader } from './site-header';
import { Ticker } from './ticker';

/** Public site chrome: skip link, header, Latest ticker, main landmark, footer, command palette. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        {t.skipToContent}
      </a>
      <SiteHeader />
      <Suspense
        fallback={
          <div aria-hidden="true" className="border-b border-line bg-surface" style={{ height: 'var(--ticker-h)' }} />
        }
      >
        <Ticker />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <LazyCommandPalette pages={PAGE_INDEX} />
    </>
  );
}
