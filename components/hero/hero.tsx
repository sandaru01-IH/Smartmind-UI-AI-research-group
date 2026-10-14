import { ButtonLink } from '@/components/ui/button';
import { t } from '@/content/strings';
import { BRAND } from '@/content/brand';
import { LazyHeroCanvas } from './lazy-hero-canvas';
import { HeroFallback } from './hero-fallback';

/**
 * Home hero. The static SVG and the text render on the server, so the largest contentful paint
 * never waits for the canvas. The canvas fades in over the SVG once it is running.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-var(--header-h)-var(--ticker-h))] flex-col justify-end overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <HeroFallback />
        <div className="absolute inset-0" id="hero-sim-host">
          <LazyHeroCanvas />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--bg) 6%, transparent 55%), linear-gradient(to right, color-mix(in oklab, var(--bg) 88%, transparent) 0%, color-mix(in oklab, var(--bg) 62%, transparent) 45%, transparent 85%)',
          }}
        />
      </div>

      <div className="container-site pb-14 pt-24 md:pb-20">
        <p className="label-mono text-muted">{t.hero.eyebrow}</p>
        <h1 id="hero-title" className="mt-5 max-w-[16ch] text-[length:var(--text-display)]">
          The city as a system of systems.
        </h1>
        <p className="mt-6 max-w-[56ch] text-lg text-fg md:text-xl">
          {BRAND.name} is a GeoAI network of Town &amp; Country Planning alumni and students at the{' '}
          {BRAND.university}, reimagining how future cities are simulated.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/research">{t.hero.primaryCta}</ButtonLink>
          <ButtonLink href="/chatbots" variant="secondary">
            {t.hero.secondaryCta}
          </ButtonLink>
        </div>
        <p className="label-mono mt-10 flex items-center gap-2.5 text-muted">
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-flood" />
          {t.hero.legend}
          <span className="hidden text-muted md:inline">· {t.hero.legendHint}</span>
        </p>
      </div>
    </section>
  );
}
