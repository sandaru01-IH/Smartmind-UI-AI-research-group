import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import { ViewTransition, type ReactNode } from 'react';
import { ThemeScript } from '@/components/theme/theme-script';
import { BRAND, SITE_URL } from '@/content/brand';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  // Static weights keep the file small. Headings use 400, the wordmark and bold labels use 600.
  weight: ['400', '600'],
});
const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
  weight: ['400', '600'],
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name}, GeoAI network | ${BRAND.lab}, ${BRAND.university}`,
    template: `%s | ${BRAND.titleSuffix}`,
  },
  description: `${BRAND.name} is a GeoAI network of Town & Country Planning alumni and students at the ${BRAND.university}, run through the ${BRAND.lab}.`,
  applicationName: BRAND.name,
  openGraph: { type: 'website', siteName: BRAND.name, locale: 'en_GB' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#090d12' },
    { media: '(prefers-color-scheme: light)', color: '#f2efe8' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-GB"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        {/* Page transitions run only for primary navigation (links tagged nav-forward). Suspense reveals never animate. */}
        <ViewTransition
          default="none"
          enter={{ 'nav-forward': 'auto', default: 'none' }}
          exit={{ 'nav-forward': 'auto', default: 'none' }}
        >
          {children}
        </ViewTransition>
      </body>
    </html>
  );
}
