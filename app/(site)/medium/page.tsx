import { Suspense } from 'react';
import { MediumCard } from '@/components/medium/medium-card';
import { Reveal } from '@/components/ui/reveal';
import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/content/strings';
import { getMediumArticles } from '@/lib/catalog/public';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Medium articles',
  description: 'Articles the Smartmind team has published on Medium.',
  path: '/medium',
});

async function Articles() {
  const articles = await getMediumArticles();
  if (articles.length === 0) return <p className="text-muted">{t.stories.mediumEmpty}</p>;
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a, i) => (
        <li key={a.id}>
          <Reveal index={i}>
            <MediumCard article={a} as="h2" />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export default function MediumPage() {
  return (
    <>
      <PageHeader
        eyebrow={t.stories.eyebrow}
        title={t.stories.mediumTitle}
        lead={t.stories.mediumLead}
      />
      <div className="container-site pb-24">
        <Suspense
          fallback={<div className="h-64 border border-line bg-surface" aria-hidden="true" />}
        >
          <Articles />
        </Suspense>
      </div>
    </>
  );
}
