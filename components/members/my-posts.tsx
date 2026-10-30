import Link from 'next/link';
import { t } from '@/content/strings';
import { formatDate } from '@/lib/format';
import type { MyBlogPost } from '@/lib/blog/types';

/** The writer's own posts, drafts and hidden ones included. */
export function MyPosts({ posts }: { posts: MyBlogPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="border border-dashed border-line-strong p-6 text-muted">
        <p>{t.blog.noPosts}</p>
        <Link
          href="/write"
          className="mt-3 inline-flex min-h-11 items-center text-fg underline underline-offset-4"
        >
          {t.blog.writeTitle}
        </Link>
      </div>
    );
  }
  return (
    <ul className="border-t border-line">
      {posts.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4"
        >
          <div className="min-w-0">
            <p className="truncate text-lg">{p.title}</p>
            <p className="label-mono mt-1 flex flex-wrap items-center gap-x-3 text-muted">
              <span>{p.status === 'published' ? t.blog.liveBadge : t.blog.draftBadge}</span>
              {p.hidden ? <span className="text-danger">{t.blog.hiddenByAdmin}</span> : null}
              <time dateTime={p.updatedAt}>{formatDate(p.updatedAt)}</time>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {p.status === 'published' && !p.hidden ? (
              <Link
                href={`/blog/${p.slug}`}
                className="inline-flex min-h-11 items-center px-3 text-muted underline underline-offset-4 hover:text-fg"
              >
                {t.blog.viewPost}
              </Link>
            ) : null}
            <Link
              href={`/write/${p.id}`}
              className="inline-flex min-h-11 items-center px-3 text-fg underline underline-offset-4"
            >
              {t.blog.edit}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
