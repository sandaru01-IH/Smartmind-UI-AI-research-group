import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PostCover } from '@/components/news/post-cover';
import { PostBody } from '@/components/ui/markdown';
import { Tag } from '@/components/ui/tag';
import { requireAdmin } from '@/lib/auth/require-admin';
import { formatDate } from '@/lib/format';
import { adminGet } from '@/lib/posts/admin';
import { publicState } from '@/lib/visibility';

/** Renders a post the way a visitor would see it, even if it is a draft or scheduled. Admin only. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await adminGet(supabase, id);
  if (!post) notFound();
  const state = publicState(post);
  return (
    <article>
      <p role="status" className="label-mono mb-8 border border-dashed border-line-strong p-3 text-muted">
        Preview as visitor. This post is currently <strong className="text-fg">{state === 'live' ? 'live' : state}</strong>
        {state !== 'live' ? ' and is not visible to visitors.' : '.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Tag>{post.category}</Tag>
        <time dateTime={post.published_at ?? undefined} className="label-mono text-muted">
          {post.published_at ? formatDate(post.published_at) : 'Not published'}
        </time>
      </div>
      <h1 className="mt-4 max-w-[24ch] text-4xl md:text-5xl">{post.title}</h1>
      {post.excerpt ? <p className="mt-5 max-w-[58ch] text-xl text-muted">{post.excerpt}</p> : null}
      <div className="mt-8 max-w-3xl">
        <PostCover post={post} sizes="768px" />
      </div>
      {post.body_md ? (
        <div className="mt-10">
          <PostBody source={post.body_md} />
        </div>
      ) : null}
    </article>
  );
}
