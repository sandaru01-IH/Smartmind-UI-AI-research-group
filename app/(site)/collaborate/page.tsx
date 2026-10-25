import { Suspense } from 'react';
import { Mail } from 'lucide-react';
import { CollabProjects } from '@/components/collaborate/collab-projects';
import { PhilosophyPrinciples } from '@/components/collaborate/principles';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { CONTACT_EMAIL } from '@/content/brand';
import { COLLAB_INTRO } from '@/content/philosophy';
import { getCollabs } from '@/lib/catalog/public';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Ongoing research and open invitation',
  description: `${COLLAB_INTRO.lead} Open to local and international researchers, students, universities, institutions and communities.`,
  path: '/collaborate',
});

async function Projects() {
  return <CollabProjects projects={await getCollabs()} />;
}

export default function CollaboratePage() {
  return (
    <>
      <PageHeader
        eyebrow={COLLAB_INTRO.eyebrow}
        title={COLLAB_INTRO.title}
        lead={COLLAB_INTRO.lead}
      >
        <p className="mt-6 max-w-[62ch] text-muted">{COLLAB_INTRO.body}</p>
      </PageHeader>

      <Section id="projects" numeral="01" title="Ongoing projects">
        <Suspense
          fallback={<div className="h-96 border border-line bg-surface" aria-hidden="true" />}
        >
          <Projects />
        </Suspense>
      </Section>

      <Section id="participate" numeral="02" title={COLLAB_INTRO.ways.title}>
        <div className="grid-12 gap-y-4">
          {COLLAB_INTRO.ways.body.map((p) => (
            <p key={p} className="col-span-12 max-w-[60ch] text-lg md:col-span-6">
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section id="principles" numeral="03" title={COLLAB_INTRO.principles.title}>
        <PhilosophyPrinciples closing={COLLAB_INTRO.principles.closing} />
      </Section>

      <section id="join" className="border-t border-line py-16 md:py-24">
        <div className="container-site grid-12 gap-y-6">
          <div className="col-span-12 md:col-span-7">
            <h2 className="text-3xl md:text-4xl">{COLLAB_INTRO.cta.title}</h2>
            <p className="mt-4 max-w-[58ch] text-lg text-muted">{COLLAB_INTRO.cta.body}</p>
          </div>
          <div className="col-span-12 flex flex-wrap items-start gap-3 md:col-span-5 md:justify-end">
            <ButtonLink
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Collaboration with SmartMind UI & SI')}`}
            >
              <Mail size={16} aria-hidden="true" />
              Email us
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              {COLLAB_INTRO.cta.label}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
