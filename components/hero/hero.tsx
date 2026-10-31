import { ButtonLink } from '@/components/ui/button';
import { t } from '@/content/strings';
import { BRAND } from '@/content/brand';
import { IDENTITY } from '@/content/philosophy';
import { LazyHeroCanvas } from './lazy-hero-canvas';
import { RollingHeadline } from './rolling-headline';
import { HeroFallback } from './hero-fallback';

/**
 * Home hero. The static depth stack and the text render on the server, so the largest contentful
 * paint never waits for the canvas. The canvas only fades in floods and agents on those same sheets.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[calc(100svh-var(--header-h)-var(--ticker-h))] flex-col justify-start overflow-hidden"
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

      <div className="container-site pb-12 pt-10 md:pb-20 md:pt-14">
        <p className="label-mono text-muted">{t.hero.eyebrow}</p>
        <h1
          id="hero-title"
          className="mt-5 max-w-[30ch] text-[length:var(--text-headline)] leading-[1.08]"
        >
          <RollingHeadline words={IDENTITY.line.split(' ')} />
        </h1>
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
