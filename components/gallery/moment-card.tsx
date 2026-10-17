import Link from 'next/link';
import { Images, Play } from 'lucide-react';
import { PostCover } from '@/components/news/post-cover';
import { Tag, TbcFlag } from '@/components/ui/tag';
import { formatDate } from '@/lib/format';
import type { Post } from '@/lib/posts/types';

/** One gallery moment: the thumbnail the admin set, a badge for video or extra photos, and the story. */
export function MomentCard({
  post,
  feature = false,
  priority = false,
}: {
  post: Post;
  feature?: boolean;
  priority?: boolean;
}) {
  const date = post.event_date ?? post.published_at;
  const photos = post.gallery_paths.length;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative overflow-hidden">
        <PostCover
          post={post}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
          sizes={
            feature
              ? '(min-width: 1024px) 66vw, 100vw'
              : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
          }
        />
        {post.video_url || photos > 0 ? (
          <p className="label-mono absolute bottom-3 left-3 flex items-center gap-3 bg-bg/90 px-2.5 py-1.5 text-fg">
            {post.video_url ? (
              <span className="inline-flex items-center gap-1.5">
                <Play size={12} aria-hidden="true" /> Video
              </span>
            ) : null}
            {photos > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Images size={12} aria-hidden="true" /> {photos + 1} photos
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className={`flex flex-1 flex-col gap-3 ${feature ? 'p-6 md:p-8' : 'p-5'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Tag>{post.category}</Tag>
          {post.tbc ? <TbcFlag /> : null}
          <time dateTime={date ?? undefined} className="label-mono text-muted">
            {formatDate(date)}
          </time>
        </div>
        <h3 className={feature ? 'text-2xl md:text-4xl' : 'text-xl'}>
          <Link
            href={`/news/${post.slug}`}
            className="after:absolute after:inset-0 group-hover:underline"
          >
            {post.title}
          </Link>
        </h3>
        {post.excerpt ? <p className="text-muted">{post.excerpt}</p> : null}
      </div>
    </article>
  );
}
