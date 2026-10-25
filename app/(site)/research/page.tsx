import { Suspense } from 'react';
import { ArchitectureDiagram } from '@/components/chatbots/architecture-diagram';
import { JourneyTimeline } from '@/components/chatbots/journey-timeline';
import { FeaturedResearch } from '@/components/research/featured-research';
import { ResearchBento } from '@/components/research/research-bento';
import { ExternalLink } from '@/components/ui/external-link';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { Tag, TbcFlag } from '@/components/ui/tag';
import { LINKS } from '@/content/brand';
import { CHATBOT_PHILOSOPHY } from '@/content/chatbots';
import { getFeatured, getMilestones, getResearch, getSpotlights } from '@/lib/catalog/public';
import { numberWord, numberWordCap, plural } from '@/lib/number-words';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Research',
  description:
    'The research themes of the Urban Simulation Lab, from urban science and disaster management to transport and AI, plus the Smartmind chatbot journey.',
  path: '/research',
});

async function Header() {
  const { themes } = await getResearch();
  const funded = themes.flatMap((t) => t.projects).filter((p) => p.src_funded).length;
  return (
    <PageHeader
      eyebrow="Research"
      title={`${numberWordCap(themes.length)} ${themes.length === 1 ? 'theme' : 'themes'}, one city`}
      lead={`The Urban Simulation Lab groups its ongoing research into ${numberWord(themes.length)} ${themes.length === 1 ? 'theme' : 'themes'}.${
        funded > 0
          ? ` ${plural(funded, 'project')} ${funded === 1 ? 'is' : 'are'} funded by the university’s SRC.`
          : ''
      }`}
    />
  );
}

/** Shown only once the admin has added featured research; nothing is kept in the code. */
async function FeaturedSection() {
  const items = await getFeatured();
  if (items.length === 0) return null;
  return (
    <Section
      id="featured"
      numeral="01"
      title="Featured research"
      lead="Key papers and projects from the network, with the people who led them."
    >
      <FeaturedResearch items={items} full />
    </Section>
  );
}

async function Themes() {
  const { themes } = await getResearch();
  return <ResearchBento themes={themes} />;
}

async function WiderTopics() {
  const { topics } = await getResearch();
  if (topics.length === 0) return null;
  return (
    <Section
      id="wider"
      numeral="04"
      title="Wider topics in the department"
      lead={`The department’s ongoing research page names ${numberWord(topics.length)} further ${topics.length === 1 ? 'topic' : 'topics'}.`}
    >
      <ul className="border-t border-line">
        {topics.map((topic, i) => (
          <li key={topic.id} className="grid-12 items-baseline border-b border-line py-4">
            <span className="numeral col-span-2 text-sm text-muted md:col-span-3">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="col-span-10 text-lg md:col-span-9">{topic.title}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <ExternalLink
          href={LINKS.departmentResearch}
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Department ongoing research page
        </ExternalLink>
      </p>
    </Section>
  );
}

async function Spotlights() {
  const items = await getSpotlights();
  return (
    <>
      {items.map((s, i) => (
        <Section
          key={s.id}
          id={i === 0 ? 'spotlight' : `spotlight-${i + 1}`}
          numeral={String(i + 5).padStart(2, '0')}
          title={s.title}
        >
          <article className="grid-12 gap-y-6 border border-line bg-surface p-6 md:p-10">
            <div className="col-span-12 flex flex-wrap items-center gap-3">
              {s.label ? <Tag>{s.label}</Tag> : null}
              {s.tbc ? <TbcFlag /> : null}
            </div>
            {s.summary ? (
              <p className="col-span-12 max-w-[58ch] text-xl md:col-span-7">{s.summary}</p>
            ) : null}
            {s.points.length > 0 ? (
              <ul className="col-span-12 space-y-2 md:col-span-5">
                {s.points.map((p) => (
                  <li key={p} className="label-mono border-t border-line pt-2 text-fg">
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
            {s.note ? <p className="col-span-12 max-w-[64ch] text-muted">{s.note}</p> : null}
          </article>
        </Section>
      ))}
    </>
  );
}

async function Journey() {
  return <JourneyTimeline milestones={await getMilestones()} />;
}

const block = <div className="h-64 border border-line bg-surface" aria-hidden="true" />;

export default function ResearchPage() {
  return (
    <>
      <Suspense fallback={<PageHeader eyebrow="Research" title="Research themes" />}>
        <Header />
      </Suspense>

      <Suspense fallback={null}>
        <FeaturedSection />
      </Suspense>

      <Section id="themes" numeral="02" title="Themes and projects">
        <Suspense fallback={block}>
          <Themes />
        </Suspense>
      </Section>

      <Section
        id="journey"
        numeral="03"
        title="The journey of Smartmind"
        lead="Research turned into chatbots: urban-planning Q&A in 2023, flood and landslide warnings in 2026."
      >
        <Suspense fallback={block}>
          <Journey />
        </Suspense>
        <div className="mt-20 md:mt-28">
          <h3 className="text-2xl md:text-3xl">How the 2026 chatbot is built</h3>
          <p className="mt-4 max-w-[60ch] text-muted">
            A WhatsApp-based, multilingual, multi-agent design. It gives residents preparedness
            guidance and lets planners interpret risk-sensitive zoning.
          </p>
          <div className="mt-8">
            <ArchitectureDiagram />
          </div>
        </div>
        <figure className="mt-20 md:mt-28">
          <blockquote className="max-w-[24ch] font-display text-3xl leading-tight tracking-tight md:text-5xl">
            {CHATBOT_PHILOSOPHY.statement}
          </blockquote>
          <figcaption className="mt-6 max-w-[56ch] text-lg text-muted">
            {CHATBOT_PHILOSOPHY.invitation}
          </figcaption>
        </figure>
      </Section>

      <Suspense fallback={null}>
        <WiderTopics />
      </Suspense>

      <Suspense fallback={null}>
        <Spotlights />
      </Suspense>
    </>
  );
}
