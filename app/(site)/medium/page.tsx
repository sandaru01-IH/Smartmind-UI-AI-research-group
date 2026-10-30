import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Medium articles',
  description: 'Articles the Smartmind team has published on Medium.',
  path: '/medium',
});

export default function MediumPage() {
  return (
    <>
      <PageHeader
        eyebrow={t.stories.eyebrow}
        title={t.stories.mediumTitle}
        lead={t.stories.mediumLead}
      />
      <div className="container-site pb-24">
        <p className="text-muted">{t.stories.mediumEmpty}</p>
      </div>
    </>
  );
}
