import Image from 'next/image';
import { t } from '@/content/strings';
import type { BlogComment } from '@/lib/blog/engage';
import { FORMER_MEMBER_NAME } from '@/lib/blog/rows';
import { formatDate } from '@/lib/format';
import { mediaUrl } from '@/lib/supabase/env';

/**
 * Comments as plain text: React escapes everything, line breaks are kept, and nothing is made into a
 * link. A comment can be deleted by its writer and by the author of the post.
 */
export function CommentList({
  comments,
  viewerId,
  postAuthorId,
  onDelete,
  busyId,
}: {
  comments: BlogComment[];
  viewerId: string | null;
  postAuthorId: string | null;
  onDelete: (id: string) => void;
  busyId?: string | null;
}) {
  if (comments.length === 0) return <p className="text-muted">{t.blog.noComments}</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {comments.map((c) => {
        const name = c.author?.displayName ?? FORMER_MEMBER_NAME;
        const photo = mediaUrl(c.author?.photoPath);
        const canDelete =
          Boolean(viewerId) && (viewerId === c.author?.id || viewerId === postAuthorId);
        return (
          <li key={c.id} className="flex gap-3 py-5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-sm text-muted">
              {photo ? (
                <Image
                  src={photo}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-3 text-[0.95rem]">
                <span className="font-semibold">{name}</span>
                <time dateTime={c.createdAt} className="label-mono text-muted">
                  {formatDate(c.createdAt)}
                </time>
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words">{c.body}</p>
              {canDelete ? (
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => onDelete(c.id)}
                  className="mt-1 inline-flex min-h-11 items-center text-[0.9rem] text-muted underline underline-offset-4 hover:text-fg"
                >
                  {t.blog.deleteComment}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
