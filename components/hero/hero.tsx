import { ButtonLink } from '@/components/ui/button';
import { t } from '@/content/strings';
import { BRAND } from '@/content/brand';
import { LazyHeroCanvas } from './lazy-hero-canvas';
import { HeroHeadline } from './hero-headline';
import { HeroFallback } from './hero-fallback';

/**
 * Home hero. The static depth stack and the text render on the server, so the largest contentful
 * paint never waits for the canvas. The canvas only fades in floods and agents on those same sheets.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-var(--header-h)-var(--ticker-h))] flex-col justify-center overflow-hidden"
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

      <div className="container-site py-10 md:py-14">
        <p className="label-mono text-muted">{t.hero.eyebrow}</p>
        <HeroHeadline />
        <p className="mt-6 max-w-[60ch] text-muted md:text-lg">
          {BRAND.name} is a collaborative research network of the Department of Town &amp; Country
          Planning, {BRAND.university}, with industry partners and local communities.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/research">{t.hero.primaryCta}</ButtonLink>
          <ButtonLink href="/research#journey" variant="secondary">
            {t.hero.secondaryCta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
