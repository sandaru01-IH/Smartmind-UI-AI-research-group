import { PublicationsExplorer } from '@/components/publications/publications-explorer';
import { PageHeader } from '@/components/ui/page-header';
import { ALL_PUBLICATIONS, LISTED_PAPER_COUNT } from '@/content/publications';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Publications',
  description: `${LISTED_PAPER_COUNT} papers listed by the Urban Simulation Lab from 2019 to 2021, plus the 2026 participatory chatbot paper.`,
  path: '/publications',
});

export default function PublicationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Publications"
        title="Papers on networks, floods and traffic"
        lead={`The lab page lists ${LISTED_PAPER_COUNT} papers from 2019 to 2021, led by Amila Jayasinghe and Chethika Abenayake. The newer chatbot work follows.`}
      />
      <div className="container-site pb-24">
        <PublicationsExplorer publications={ALL_PUBLICATIONS} />
      </div>
    </>
  );
}
