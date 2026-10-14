'use client';

import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-site flex min-h-[70vh] flex-col justify-center py-20">
      <p className="label-mono text-muted">Error</p>
      <h1 className="mt-4 text-4xl md:text-6xl">{t.errors.errorTitle}</h1>
      <p className="mt-5 max-w-[48ch] text-lg text-muted">{t.errors.errorBody}</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>{t.errors.retry}</Button>
        <Link href="/" className={buttonClass('secondary')}>
          {t.errors.home}
        </Link>
      </div>
    </main>
  );
}
