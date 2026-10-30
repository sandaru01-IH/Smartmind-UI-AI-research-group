import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { MemberPage } from '@/components/members/member-page';
import { PostEditor } from '@/components/members/post-editor';
import { t } from '@/content/strings';
import { getMyPost } from '@/lib/blog/member';
import type { MemberContext } from '@/lib/members/session';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({ title: 'Edit your post', description: 'Edit your post.', path: '/write' }),
  robots: { index: false, follow: false },
};

async function Editor({ id, member }: { id: string; member: MemberContext }) {
  const post = await getMyPost(member.supabase, member.user.id, id);
  if (!post) notFound();
  return <PostEditor post={post} />;
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return (
    <MemberPage next={`/write/${id}`} title={t.blog.editTitle} needsVerified>
      {(member) => <Editor id={id} member={member} />}
    </MemberPage>
  );
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="container-site h-96 py-20" aria-busy="true" />}>
      <Content params={params} />
    </Suspense>
  );
}
