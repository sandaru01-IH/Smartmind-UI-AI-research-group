import { ButtonLink } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { ABOUT } from '@/content/about';
import { PhilosophyTriangle } from '@/components/home/philosophy-triangle';
import { IDENTITY } from '@/content/philosophy';
import { BRAND, LINKS } from '@/content/brand';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'About',
  description: ABOUT.summary,
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow={`About · ${IDENTITY.full}`}
        title={IDENTITY.line}
        compact
        lead={IDENTITY.intro}
      >
        <p className="mt-6 max-w-[62ch] text-muted">{IDENTITY.explore}</p>
        <p className="mt-4 max-w-[62ch] text-muted">{IDENTITY.mindset}</p>
      </PageHeader>

      <Section id="philosophy" numeral="01" title="Philosophy, approach and vision">
        <PhilosophyTriangle />
      </Section>

      <Section id="idea" numeral="02" title="The core idea">
        <blockquote className="max-w-[28ch] font-display text-3xl leading-tight tracking-tight md:text-5xl">
          {ABOUT.coreIdea}
        </blockquote>
      </Section>

      <Section id="home" numeral="03" title="Its home">
        <div className="grid-12 gap-y-6">
          <p className="col-span-12 max-w-[56ch] text-lg md:col-span-7">{ABOUT.home}</p>
          <div className="col-span-12 md:col-span-4 md:col-start-9">
            <p className="label-mono text-muted">Lab tagline</p>
            <p className="mt-2 font-display text-2xl tracking-tight">“{BRAND.tagline}”</p>
            <p className="mt-6">
              <ExternalLink
                href={LINKS.labPage}
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                {BRAND.lab} at the University of Moratuwa
              </ExternalLink>
            </p>
          </div>
        </div>
      </Section>

      <Section id="work" numeral="04" title="What it is known for" lead={ABOUT.mostVisibleWork}>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/research#journey">The journey</ButtonLink>
          <ButtonLink href="/research" variant="secondary">
            The research
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
