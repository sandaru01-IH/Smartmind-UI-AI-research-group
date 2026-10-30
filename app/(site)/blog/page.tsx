import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Blog',
  description: 'Writing from people in the network, on Smartmind.',
  path: '/blog',
});

export default function BlogPage() {
  return (
    <>
      <PageHeader
        eyebrow={t.stories.eyebrow}
        title={t.stories.blogTitle}
        lead={t.stories.blogLead}
      />
      <div className="container-site pb-24">
        <p className="text-muted">{t.stories.blogEmpty}</p>
      </div>
    </>
  );
}
