import { Suspense, type ReactNode } from 'react';
import { PaletteLoader } from '@/components/palette/palette-loader';
import { t } from '@/content/strings';
import { SiteFooter } from './site-footer';
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
      <Suspense fallback={null}>
        <Ticker />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      <Suspense fallback={null}>
        <PaletteLoader />
      </Suspense>
    </>
  );
}
