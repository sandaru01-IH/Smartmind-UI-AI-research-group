import Link from 'next/link';
import { Suspense } from 'react';
import { MemberPage } from '@/components/members/member-page';
import { MyPosts } from '@/components/members/my-posts';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { listMyPosts } from '@/lib/blog/member';
import type { MemberContext } from '@/lib/members/session';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({ title: 'My posts', description: 'Your posts.', path: '/account/posts' }),
  robots: { index: false, follow: false },
};

async function Posts({ member }: { member: MemberContext }) {
  const posts = await listMyPosts(member.supabase, member.user.id);
  return (
    <div className="space-y-6">
      {member.canPost ? (
        <Link href="/write" className={buttonClass('primary')}>
          {t.blog.newPost}
        </Link>
      ) : (
        <p role="status" className="border border-line-strong p-4 text-muted">
          {member.profile.blocked ? t.blog.blocked : t.blog.verifyBanner}
        </p>
      )}
      <MyPosts posts={posts} />
    </div>
  );
}

async function Content() {
  return (
    <MemberPage next="/account/posts" title={t.blog.myPostsTitle}>
      {(member) => <Posts member={member} />}
    </MemberPage>
  );
}

export default function MyPostsPage() {
  return (
    <Suspense fallback={<div className="container-site h-96 py-20" aria-busy="true" />}>
      <Content />
    </Suspense>
  );
}
