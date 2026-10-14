import { SiteShell } from '@/components/layout/site-shell';
import { ButtonLink } from '@/components/ui/button';
import { t } from '@/content/strings';

export default function NotFound() {
  return (
    <SiteShell>
      <section className="container-site flex min-h-[60vh] flex-col justify-center py-20">
        <p className="numeral text-[length:var(--text-display)] text-line-strong" aria-hidden="true">
          404
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl">{t.errors.notFoundTitle}</h1>
        <p className="mt-5 max-w-[48ch] text-lg text-muted">{t.errors.notFoundBody}</p>
        <div className="mt-8 flex gap-3">
          <ButtonLink href="/">{t.errors.home}</ButtonLink>
          <ButtonLink href="/news" variant="secondary">
            {t.nav.news}
          </ButtonLink>
        </div>
      </section>
    </SiteShell>
  );
}
