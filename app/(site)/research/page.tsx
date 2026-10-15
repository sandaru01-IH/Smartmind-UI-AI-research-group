import { ArchitectureDiagram } from '@/components/chatbots/architecture-diagram';
import { JourneyTimeline } from '@/components/chatbots/journey-timeline';
import { ResearchBento } from '@/components/research/research-bento';
import { ExternalLink } from '@/components/ui/external-link';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { Tag, TbcFlag } from '@/components/ui/tag';
import { LINKS } from '@/content/brand';
import { CHATBOT_PHILOSOPHY, MILESTONES } from '@/content/chatbots';
import { FOURONSE, SRC_FUNDED_COUNT, WIDER_TOPICS } from '@/content/research';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Research',
  description:
    'Four research themes from the Urban Simulation Lab: urban science, disaster management, transport and mobility systems, and AI and machine learning. Plus the Smartmind chatbot journey.',
  path: '/research',
});

export default function ResearchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Four themes, one city"
        lead={`The Urban Simulation Lab groups its ongoing research into four themes. ${SRC_FUNDED_COUNT} projects are funded by the university’s SRC.`}
      />

      <Section id="themes" numeral="01" title="Themes and projects">
        <ResearchBento />
      </Section>

      <Section
        id="journey"
        numeral="02"
        title="The journey of Smartmind"
        lead="Research turned into chatbots: urban-planning Q&A in 2023, flood and landslide warnings in 2026."
      >
        <JourneyTimeline milestones={MILESTONES} />
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

      <Section
        id="wider"
        numeral="03"
        title="Wider topics in the department"
        lead="The department’s ongoing research page names seven further topics."
      >
        <ul className="border-t border-line">
          {WIDER_TOPICS.map((topic, i) => (
            <li key={topic} className="grid-12 items-baseline border-b border-line py-4">
              <span className="numeral col-span-2 text-sm text-muted md:col-span-3">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="col-span-10 text-lg md:col-span-9">{topic}</span>
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

      <Section id="4onse" numeral="04" title={FOURONSE.name}>
        <article className="grid-12 gap-y-6 border border-line bg-surface p-6 md:p-10">
          <div className="col-span-12 flex flex-wrap items-center gap-3">
            <Tag>Weather station</Tag>
            <TbcFlag />
          </div>
          <p className="col-span-12 max-w-[58ch] text-xl md:col-span-7">{FOURONSE.summary}</p>
          <ul className="col-span-12 space-y-2 md:col-span-5">
            {FOURONSE.stack.map((s) => (
              <li key={s} className="label-mono border-t border-line pt-2 text-fg">
                {s}
              </li>
            ))}
          </ul>
          <p className="col-span-12 max-w-[64ch] text-muted">{FOURONSE.partner}</p>
        </article>
      </Section>
    </>
  );
}
