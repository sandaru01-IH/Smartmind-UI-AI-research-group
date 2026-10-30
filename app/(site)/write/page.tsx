import { Suspense } from 'react';
import { MemberPage } from '@/components/members/member-page';
import { PostEditor } from '@/components/members/post-editor';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({ title: 'Write a post', description: 'Write a post.', path: '/write' }),
  robots: { index: false, follow: false },
};

async function Content() {
  return (
    <MemberPage next="/write" title={t.blog.writeTitle} needsVerified>
      {() => <PostEditor post={null} />}
    </MemberPage>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={<div className="container-site h-96 py-20" aria-busy="true" />}>
      <Content />
    </Suspense>
  );
}
