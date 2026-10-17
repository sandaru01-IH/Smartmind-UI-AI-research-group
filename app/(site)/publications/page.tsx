import { Suspense } from 'react';
import { PublicationsExplorer } from '@/components/publications/publications-explorer';
import { PageHeader } from '@/components/ui/page-header';
import { getPublications } from '@/lib/catalog/public';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Publications',
  description:
    'Papers, posters and reports from the Urban Simulation Lab and the Smartmind team, with the people behind each.',
  path: '/publications',
});

async function List() {
  return <PublicationsExplorer publications={await getPublications()} />;
}

export default function PublicationsPage() {
  return (
    <>
      <PageHeader eyebrow="Publications" title="Read our publications." />
      <div className="container-site pb-24">
        <Suspense
          fallback={<div className="h-96 border border-line bg-surface" aria-hidden="true" />}
        >
          <List />
        </Suspense>
      </div>
    </>
  );
}
