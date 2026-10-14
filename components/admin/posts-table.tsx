'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Copy, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { deletePostAction, duplicatePostAction, setPublishedAction } from '@/app/admin/actions';
import { buttonClass } from '@/components/ui/button';
import { Tag, TbcFlag } from '@/components/ui/tag';
import { formatDateShort } from '@/lib/format';
import type { PublicState } from '@/lib/visibility';
import { useToast } from './toast';

export interface AdminRow {
  id: string;
  title: string;
  slug: string;
  type: 'article' | 'update';
  category: string;
  state: PublicState;
  featured: boolean;
  tbc: boolean;
  published_at: string | null;
  updated_at: string;
}

const STATE_LABEL: Record<PublicState, string> = {
  live: 'Published',
  scheduled: 'Scheduled',
  draft: 'Draft',
};

export function PostsTable({ rows }: { rows: AdminRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<AdminRow | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.push(success);
        router.refresh();
      } else toast.push(r.message ?? 'Something went wrong.', 'error');
    });

  const ask = (row: AdminRow) => {
    setConfirm(row);
    queueMicrotask(() => dialogRef.current?.showModal());
  };

  if (rows.length === 0) {
    return <p className="border border-line p-6 text-muted">No posts match these filters.</p>;
  }

  const iconBtn = buttonClass('ghost', 'h-11 w-11 min-h-11 px-0');

  return (
    <>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[44rem] text-left text-[0.95rem]">
          <caption className="sr-only">Posts</caption>
          <thead className="label-mono border-b border-line bg-surface text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Title
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Updated
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/posts/${r.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Tag>{r.type === 'update' ? 'Update' : 'Article'}</Tag>
                    <Tag>{r.category}</Tag>
                    {r.featured ? <Tag>Featured</Tag> : null}
                    {r.tbc ? <TbcFlag /> : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="label-mono text-fg">{STATE_LABEL[r.state]}</span>
                  {r.published_at ? (
                    <span className="label-mono block text-muted">
                      {formatDateShort(r.published_at)}
                    </span>
                  ) : null}
                </td>
                <td className="label-mono px-4 py-3 text-muted">{formatDateShort(r.updated_at)}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-0.5">
                    <Link
                      href={`/admin/posts/${r.id}`}
                      className={iconBtn}
                      aria-label={`Edit ${r.title}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className={iconBtn}
                      disabled={pending}
                      aria-label={`${r.state === 'draft' ? 'Publish' : 'Unpublish'} ${r.title}`}
                      onClick={() =>
                        run(
                          () => setPublishedAction(r.id, r.state === 'draft'),
                          r.state === 'draft' ? 'Published.' : 'Unpublished. It is a draft again.',
                        )
                      }
                    >
                      {r.state === 'draft' ? (
                        <Eye size={16} aria-hidden="true" />
                      ) : (
                        <EyeOff size={16} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      disabled={pending}
                      aria-label={`Duplicate ${r.title}`}
                      onClick={() => run(() => duplicatePostAction(r.id), 'Duplicated as a draft.')}
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      disabled={pending}
                      aria-label={`Delete ${r.title}`}
                      onClick={() => ask(r)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="del-title"
        onClose={() => setConfirm(null)}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-sharp border border-line-strong bg-surface p-6 text-fg backdrop:bg-black/60"
      >
        <h2 id="del-title" className="text-xl">
          Delete this post?
        </h2>
        <p className="mt-3 text-muted">
          “{confirm?.title}” will be removed for good. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={buttonClass('secondary')}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass('danger')}
            disabled={pending}
            onClick={() => {
              const id = confirm?.id;
              dialogRef.current?.close();
              if (id) run(() => deletePostAction(id), 'Deleted.');
            }}
          >
            Delete
          </button>
        </div>
      </dialog>
    </>
  );
}
