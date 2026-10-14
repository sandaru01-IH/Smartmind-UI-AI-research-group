import { ButtonLink } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { CollaborateCta } from '@/components/home/collaborate-cta';
import { ABOUT } from '@/content/about';
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
      <PageHeader eyebrow="About" title="A network that simulates cities" lead={ABOUT.summary} />

      <Section id="what" numeral="01" title="What Smartmind is">
        <dl className="border-t border-line">
          {ABOUT.facts.map((f, i) => (
            <Reveal key={f.label} index={i} className="grid-12 gap-y-1 border-b border-line py-5">
              <dt className="label-mono col-span-12 text-muted md:col-span-3">{f.label}</dt>
              <dd className="col-span-12 text-lg md:col-span-9">{f.value}</dd>
            </Reveal>
          ))}
        </dl>
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
              <ExternalLink href={LINKS.labPage} className="inline-flex min-h-11 items-center underline underline-offset-4">
                {BRAND.lab} at the University of Moratuwa
              </ExternalLink>
            </p>
          </div>
        </div>
      </Section>

      <Section id="work" numeral="04" title="What it is known for" lead={ABOUT.mostVisibleWork}>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/chatbots">The chatbot journey</ButtonLink>
          <ButtonLink href="/research" variant="secondary">
            The research
          </ButtonLink>
        </div>
      </Section>

      <section className="border-t border-line py-16 md:py-24">
        <div className="container-site">
          <CollaborateCta />
        </div>
      </section>
    </>
  );
}
