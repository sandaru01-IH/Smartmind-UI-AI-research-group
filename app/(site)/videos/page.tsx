import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Videos',
  description: 'Videos from the Smartmind YouTube channel.',
  path: '/videos',
});

export default function VideosPage() {
  return (
    <>
      <PageHeader
        eyebrow={t.stories.eyebrow}
        title={t.stories.videosTitle}
        lead={t.stories.videosLead}
      />
      <div className="container-site pb-24">
        <p className="text-muted">{t.stories.videosEmpty}</p>
      </div>
    </>
  );
}
