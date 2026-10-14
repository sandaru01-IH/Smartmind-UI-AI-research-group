import Link from 'next/link';
import { Tag } from '@/components/ui/tag';
import { formatDate } from '@/lib/format';
import type { Post } from '@/lib/posts/types';
import { PostCover } from './post-cover';

/** News card. `variant="feature"` is the large one used for the featured post. */
export function PostCard({
  post,
  variant = 'default',
  priority = false,
}: {
  post: Post;
  variant?: 'default' | 'feature' | 'compact';
  priority?: boolean;
}) {
  const date = post.published_at;
  if (variant === 'compact') {
    return (
      <article className="group border-t border-line py-5 first:border-t-0">
        <Link href={`/news/${post.slug}`} className="block">
          <div className="flex flex-wrap items-center gap-3">
            <Tag>{post.category}</Tag>
            <time dateTime={date ?? undefined} className="label-mono text-muted">
              {formatDate(date)}
            </time>
          </div>
          <h3 className="mt-3 text-xl group-hover:underline">{post.title}</h3>
        </Link>
      </article>
    );
  }
  const feature = variant === 'feature';
  return (
    <article className="group relative flex h-full flex-col border border-line bg-surface transition-colors hover:border-line-strong">
      <PostCover
        post={post}
        priority={priority}
        sizes={
          feature
            ? '(min-width: 1024px) 60vw, 100vw'
            : '(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw'
        }
      />
      <div className={`flex flex-1 flex-col gap-4 ${feature ? 'p-6 md:p-8' : 'p-5'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <Tag>{post.category}</Tag>
          <time dateTime={date ?? undefined} className="label-mono text-muted">
            {formatDate(date)}
          </time>
        </div>
        <h3 className={feature ? 'text-2xl md:text-3xl' : 'text-xl'}>
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
