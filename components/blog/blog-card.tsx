import Image from 'next/image';
import Link from 'next/link';
import { CoverArt } from '@/components/art/cover-art';
import { t } from '@/content/strings';
import { formatDate } from '@/lib/format';
import { authorName, type BlogPostSummary } from '@/lib/blog/rows';
import { mediaUrl } from '@/lib/supabase/env';

/** A community post card: cover, title, summary, writer and date. The whole card opens the post. */
export function BlogCard({
  post,
  as: Heading = 'h3',
}: {
  post: BlogPostSummary;
  as?: 'h2' | 'h3';
}) {
  const src = mediaUrl(post.coverPath);
  return (
    <article className="group relative flex h-full flex-col border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
        {src ? (
          <Image
            src={src}
            alt={post.coverAlt ?? ''}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <CoverArt seed={post.slug} category="Research" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-mono text-muted">{t.stories.blogBadge}</span>
          <time dateTime={post.publishedAt} className="label-mono text-muted">
            {formatDate(post.publishedAt)}
          </time>
        </div>
        <Heading className="text-xl">
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 group-hover:underline"
          >
            {post.title}
          </Link>
        </Heading>
        {post.summary ? <p className="text-muted">{post.summary}</p> : null}
        <p className="mt-auto text-sm text-muted">{authorName(post.author)}</p>
      </div>
    </article>
  );
}
