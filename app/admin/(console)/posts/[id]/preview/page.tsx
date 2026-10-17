import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { z } from 'zod';
import { PostCover } from '@/components/news/post-cover';
import { ButtonLink } from '@/components/ui/button';
import { PostBody } from '@/components/ui/markdown';
import { Tag, TbcFlag } from '@/components/ui/tag';
import { requireAdmin } from '@/lib/auth/require-admin';
import { formatDate } from '@/lib/format';
import { adminGet } from '@/lib/posts/admin';
import { PLATFORM_LABEL } from '@/lib/schemas';
import { mediaUrl } from '@/lib/supabase/env';
import { embedUrl } from '@/lib/video';
import { publicState } from '@/lib/visibility';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

/** Renders a post the way a visitor would see it, even if it is a draft or scheduled. Admin only. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await adminGet(supabase, id);
  if (!post) notFound();
  const state = publicState(post);
  const video = embedUrl(post.video_url);
  const photos = post.gallery_paths.map((p) => mediaUrl(p)).filter((u): u is string => Boolean(u));
  const where = [
    post.show_in_news ? 'the news section' : null,
    post.show_in_ticker ? 'the "now" ticker' : null,
    post.in_gallery ? 'the gallery' : null,
  ].filter(Boolean);
  return (
    <article>
      <p
        role="status"
        className="label-mono mb-8 border border-dashed border-line-strong p-3 text-muted"
      >
        Preview as visitor. This post is currently{' '}
        <strong className="text-fg">{state === 'live' ? 'live' : state}</strong>
        {state !== 'live' ? ' and is not visible to visitors.' : '.'}
        {where.length > 0
          ? ` It appears in ${where.join(', ')}.`
          : ' It is not set to appear anywhere yet.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Tag>{post.category}</Tag>
        {post.tbc ? <TbcFlag /> : null}
        <time dateTime={post.published_at ?? undefined} className="label-mono text-muted">
          {post.published_at ? formatDate(post.published_at) : 'Not published'}
        </time>
      </div>
      <h1 className="mt-4 max-w-[24ch] text-4xl md:text-5xl">{post.title}</h1>
      {post.excerpt ? <p className="mt-5 max-w-[58ch] text-xl text-muted">{post.excerpt}</p> : null}
      <div className="mt-8 max-w-3xl">
        <PostCover post={post} sizes="768px" />
      </div>
      {video ? (
        <div className="relative mt-8 aspect-video max-w-3xl border border-line bg-surface-2">
          <iframe
            src={video}
            title={`Video: ${post.title}`}
            loading="lazy"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ) : null}
      {post.body_md ? (
        <div className="mt-10">
          <PostBody source={post.body_md} />
        </div>
      ) : null}
      {photos.length > 0 ? (
        <ul className="mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] overflow-hidden border border-line">
              <Image src={src} alt={`Photo ${i + 2}`} fill sizes="240px" className="object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
      {post.external_links.length > 0 ? (
        <ul className="mt-10 flex flex-wrap gap-3">
          {post.external_links.map((l) => (
            <li key={l.url}>
              <ButtonLink href={l.url} variant="secondary">
                {PLATFORM_LABEL[l.platform]}
              </ButtonLink>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
