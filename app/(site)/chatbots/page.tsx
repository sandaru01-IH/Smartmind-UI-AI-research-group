import { ArchitectureDiagram } from '@/components/chatbots/architecture-diagram';
import { JourneyTimeline } from '@/components/chatbots/journey-timeline';
import { CollaborateCta } from '@/components/home/collaborate-cta';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { CHATBOT_PHILOSOPHY, MILESTONES } from '@/content/chatbots';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Chatbots',
  description:
    'From urban-planning Q&A in 2023 to a WhatsApp flood and landslide chatbot in 2026: the Smartmind chatbot journey.',
  path: '/chatbots',
});

export default function ChatbotsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Chatbots"
        title="From planning Q&A to flood warnings"
        lead="Smartmind’s most visible work is a line of AI chatbots. They began as urban-planning Q&A in 2023 and grew into disaster-awareness bots for landslides and floods."
      />

      <Section id="journey" numeral="01" title="The journey">
        <JourneyTimeline milestones={MILESTONES} />
      </Section>

      <Section
        id="architecture"
        numeral="02"
        title="How the 2026 chatbot is built"
        lead="A WhatsApp-based, multilingual, multi-agent design. It gives residents preparedness guidance and lets planners interpret risk-sensitive zoning."
      >
        <ArchitectureDiagram />
      </Section>

      <Section id="philosophy" numeral="03" title="Why institution-specific">
        <p className="max-w-[24ch] font-display text-3xl leading-tight tracking-tight md:text-5xl">
          {CHATBOT_PHILOSOPHY.statement}
        </p>
        <p className="mt-8 max-w-[56ch] text-lg text-muted">{CHATBOT_PHILOSOPHY.invitation}</p>
      </Section>

      <section className="border-t border-line py-16 md:py-24">
        <div className="container-site">
          <CollaborateCta />
        </div>
      </section>
    </>
  );
}
