'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, Save } from 'lucide-react';
import { deleteBlogPostAction, saveBlogPostAction } from '@/app/blog-actions';
import { Field, areaClass, fieldClass } from '@/components/admin/form-bits';
import { ImageUploader } from '@/components/admin/image-uploader';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { useToast } from '@/components/admin/toast';
import { BlogBody } from '@/components/blog/blog-body';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { blogPostInputSchema } from '@/lib/blog/schema';
import type { MyBlogPost } from '@/lib/blog/types';
import { uploadMemberImage } from './member-upload';

const FLASH_KEY = 'sm-editor-flash';
type Errors = Record<string, string[]>;
const first = (e: Errors, k: string) => e[k]?.[0];

/** Write or edit a post: title, summary, cover, the text, and Save draft / Publish / Unpublish / Delete. */
export function PostEditor({ post }: { post: MyBlogPost | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [id, setId] = useState(post?.id ?? null);
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status ?? 'draft');
  const [slug, setSlug] = useState(post?.slug ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [d, setD] = useState({
    title: post?.title ?? '',
    summary: post?.summary ?? '',
    body_md: post?.bodyMd ?? '',
    cover_path: post?.coverPath ?? (null as string | null),
    cover_alt: post?.coverAlt ?? '',
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));
  const valid = blogPostInputSchema.safeParse(d).success;

  // Show the message left by the save that moved the page to this post's own address.
  useEffect(() => {
    const flash = sessionStorage.getItem(FLASH_KEY);
    if (!flash) return;
    sessionStorage.removeItem(FLASH_KEY);
    toast.push(flash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (publish: boolean, message: string) =>
    start(async () => {
      setErrors({});
      const r = await saveBlogPostAction({ id, values: d, publish });
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        return toast.push(r.message, 'error');
      }
      setStatus(r.data.status);
      setSlug(r.data.slug);
      if (!id) {
        setId(r.data.id);
        // The page moves to the post's own address and remounts, so the message is shown there.
        sessionStorage.setItem(FLASH_KEY, message);
        router.replace(`/write/${r.data.id}`);
      } else {
        toast.push(message);
      }
    });

  const remove = () =>
    start(async () => {
      if (!id) return;
      const r = await deleteBlogPostAction(id);
      if (!r.ok) return toast.push(r.message, 'error');
      toast.push(t.blog.deleted);
      router.push('/account/posts');
    });

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save(status === 'published', status === 'published' ? t.blog.published : t.blog.savedDraft);
      }}
    >
      {post?.hidden ? (
        <p role="status" className="border border-line-strong p-4 text-muted">
          <strong className="text-fg">{t.blog.hiddenByAdmin}.</strong> {t.blog.hiddenNote}
        </p>
      ) : null}
      <Field id="bp-title" label={t.blog.titleLabel} error={first(errors, 'title')}>
        <input
          id="bp-title"
          value={d.title}
          onChange={(e) => set('title', e.target.value)}
          maxLength={160}
          className={fieldClass}
          required
        />
      </Field>
      <Field
        id="bp-summary"
        label={t.blog.summaryLabel}
        hint={t.blog.summaryHint}
        error={first(errors, 'summary')}
      >
        <textarea
          id="bp-summary"
          rows={3}
          value={d.summary}
          onChange={(e) => set('summary', e.target.value)}
          maxLength={300}
          className={areaClass}
        />
      </Field>
      <div>
        <p className="label-mono mb-2 text-muted">{t.blog.coverLabel}</p>
        <ImageUploader
          name="blog"
          value={{ path: d.cover_path, alt: d.cover_alt }}
          onChange={(v) => setD((p) => ({ ...p, cover_path: v.path, cover_alt: v.alt }))}
          onError={(m) => toast.push(m, 'error')}
          altError={first(errors, 'cover_alt')}
          upload={uploadMemberImage}
        />
      </div>
      <div>
        <p className="label-mono mb-2 text-muted">{t.blog.bodyLabel}</p>
        <MarkdownEditor
          value={d.body_md}
          onChange={(v) => set('body_md', v)}
          error={first(errors, 'body_md')}
          onUploadImage={uploadMemberImage}
          imageAltText={t.blog.imageAlt}
          renderPreview={(source) => <BlogBody md={source} />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        {status === 'published' ? (
          <>
            <button type="submit" disabled={pending || !valid} className={buttonClass('primary')}>
              {pending ? (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              {t.blog.update}
            </button>
            <button
              type="button"
              disabled={pending || !valid}
              onClick={() => save(false, t.blog.unpublished)}
              className={buttonClass('secondary')}
            >
              {t.blog.unpublish}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={pending || !valid}
              onClick={() => save(true, t.blog.published)}
              className={buttonClass('primary')}
            >
              {pending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
              {t.blog.publish}
            </button>
            <button type="submit" disabled={pending || !valid} className={buttonClass('secondary')}>
              <Save size={16} aria-hidden="true" /> {t.blog.saveDraft}
            </button>
          </>
        )}
        {status === 'published' && slug && !post?.hidden ? (
          <Link href={`/blog/${slug}`} className={buttonClass('ghost')}>
            {t.blog.viewPost}
          </Link>
        ) : null}
        {id ? (
          confirmDelete ? (
            <span
              className="ml-auto flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t.blog.deleteConfirm}
            >
              <span className="text-muted">{t.blog.deleteConfirm}</span>
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className={buttonClass('secondary')}
              >
                {t.blog.delete}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={buttonClass('ghost')}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={`${buttonClass('ghost')} ml-auto`}
            >
              {t.blog.delete}
            </button>
          )
        ) : null}
      </div>
    </form>
  );
}
