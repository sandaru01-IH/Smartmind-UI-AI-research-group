'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Eye, Loader2, Save, Trash2 } from 'lucide-react';
import { deletePostAction, savePostAction } from '@/app/admin/actions';
import { buttonClass } from '@/components/ui/button';
import { TbcFlag } from '@/components/ui/tag';
import { fromLocalInput, toLocalInput } from '@/lib/datetime';
import type { Post } from '@/lib/posts/types';
import { hasTbcFlag } from '@/lib/posts/types';
import { CATEGORIES, TITLE_MAX, UPDATE_HEADLINE_MAX, postInputSchema } from '@/lib/schemas';
import { isValidSlug, slugify } from '@/lib/slug';
import { ImageUploader } from './image-uploader';
import { MarkdownEditor } from './markdown-editor';
import { useToast } from './toast';

interface Draft {
  type: 'article' | 'update';
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  category: (typeof CATEGORIES)[number];
  tags: string;
  cover_path: string | null;
  cover_alt: string;
  link_url: string;
  event_date: string;
  featured: boolean;
  status: 'draft' | 'published';
  published_at: string;
}

const blank = (type: 'article' | 'update'): Draft => ({
  type,
  title: '',
  slug: '',
  excerpt: '',
  body_md: '',
  category: 'News',
  tags: '',
  cover_path: null,
  cover_alt: '',
  link_url: '',
  event_date: '',
  featured: false,
  status: 'draft',
  published_at: '',
});

const fromPost = (p: Post): Draft => ({
  type: p.type,
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  body_md: p.body_md,
  category: p.category,
  tags: p.tags.join(', '),
  cover_path: p.cover_path,
  cover_alt: p.cover_alt ?? '',
  link_url: p.link_url ?? '',
  event_date: p.event_date ?? '',
  featured: p.featured,
  status: p.status,
  published_at: toLocalInput(p.published_at),
});

const toValues = (d: Draft) => ({
  ...d,
  tags: d.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  published_at: fromLocalInput(d.published_at),
});

/** True when the draft is set to publish at a time that has not arrived yet. */
function isFutureSchedule(d: Draft): boolean {
  const at = fromLocalInput(d.published_at);
  return d.status === 'published' && at !== null && new Date(at).getTime() > Date.now();
}

const field =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';
const areaField =
  'w-full rounded-sharp border border-line-strong bg-surface p-3 text-base text-fg placeholder:text-muted';

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-mono mb-2 block text-muted">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[0.9rem] text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[0.9rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PostEditor({ post }: { post: Post | null }) {
  const router = useRouter();
  const toast = useToast();
  const [id, setId] = useState<string | null>(post?.id ?? null);
  const [d, setD] = useState<Draft>(post ? fromPost(post) : blank('article'));
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);
  // Whether the chosen publish time is still in the future. Evaluated when the author edits, not during render.
  const [scheduled, setScheduled] = useState(() =>
    isFutureSchedule(post ? fromPost(post) : blank('article')),
  );
  const latest = useRef({ d, id });
  useEffect(() => {
    latest.current = { d, id };
  });
  const tbc = post ? hasTbcFlag(post) : false;

  const set = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) => {
      setD((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'title' && !slugTouched) next.slug = slugify(String(value)).slice(0, 80);
        return next;
      });
      if (key === 'status' || key === 'published_at') {
        setScheduled(isFutureSchedule({ ...latest.current.d, [key]: value }));
      }
      setDirty(true);
    },
    [slugTouched],
  );

  const valid = useMemo(() => postInputSchema.safeParse(toValues(d)).success, [d]);
  const isUpdate = d.type === 'update';

  const save = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const { d: cur, id: curId } = latest.current;
      setSaving(true);
      const res = await savePostAction({ id: curId, values: toValues(cur) });
      setSaving(false);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        if (!opts.silent) toast.push(res.message, 'error');
        return false;
      }
      setErrors({});
      setDirty(false);
      setSavedAt(new Date());
      if (!curId) {
        setId(res.data.id);
        window.history.replaceState(null, '', `/admin/posts/${res.data.id}`);
      }
      if (!opts.silent)
        toast.push(cur.status === 'published' ? 'Saved and published.' : 'Draft saved.');
      return true;
    },
    [toast],
  );

  // Autosave drafts only. Published posts change only when the author saves explicitly.
  useEffect(() => {
    if (!dirty || d.status !== 'draft' || !valid) return;
    const t = window.setTimeout(() => void save({ silent: true }), 2500);
    return () => window.clearTimeout(t);
  }, [d, dirty, valid, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const on = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [save]);

  const err = (k: string) => errors[k]?.[0];
  const titleMax = isUpdate ? UPDATE_HEADLINE_MAX : TITLE_MAX;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-8"
      noValidate
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center text-[0.95rem] text-muted hover:text-fg"
          >
            ← Dashboard
          </Link>
          <h1 className="text-3xl">{id ? 'Edit post' : 'New post'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p role="status" className="label-mono text-muted">
              {saving
                ? 'Saving…'
                : savedAt
                  ? `Saved ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                  : dirty
                    ? 'Unsaved changes'
                    : 'No changes'}
            </p>
            {tbc ? <TbcFlag /> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {id ? (
            <Link
              href={`/admin/posts/${id}/preview`}
              target="_blank"
              className={buttonClass('secondary')}
            >
              <Eye size={16} aria-hidden="true" /> Preview as visitor
            </Link>
          ) : null}
          <button type="submit" disabled={saving || !valid} className={buttonClass('primary')}>
            {saving ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <fieldset className="flex gap-2">
            <legend className="label-mono mb-2 text-muted">Type</legend>
            {(['article', 'update'] as const).map((t) => (
              <label
                key={t}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-sharp border px-4 text-[0.95rem] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${d.type === t ? 'border-signal bg-surface-2 font-semibold' : 'border-line-strong text-muted'}`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={d.type === t}
                  onChange={() => set('type', t)}
                  className="sr-only"
                />
                {t === 'article' ? 'Article' : 'Update (ticker)'}
              </label>
            ))}
          </fieldset>

          <Field
            id="title"
            label={isUpdate ? `Headline (up to ${UPDATE_HEADLINE_MAX} characters)` : 'Title'}
            error={err('title')}
          >
            <input
              id="title"
              value={d.title}
              maxLength={titleMax}
              onChange={(e) => set('title', e.target.value)}
              aria-invalid={err('title') ? true : undefined}
              aria-describedby={err('title') ? 'title-err' : undefined}
              className={field}
              required
            />
          </Field>

          <Field id="slug" label="Slug" error={err('slug')} hint={`/news/${d.slug || 'your-slug'}`}>
            <input
              id="slug"
              value={d.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', e.target.value.toLowerCase());
              }}
              aria-invalid={err('slug') || (d.slug && !isValidSlug(d.slug)) ? true : undefined}
              aria-describedby={err('slug') ? 'slug-err' : undefined}
              className={`${field} font-mono`}
              spellCheck={false}
            />
          </Field>

          {!isUpdate ? (
            <>
              <Field
                id="excerpt"
                label="Excerpt"
                error={err('excerpt')}
                hint="Shown on cards and in search results. Up to 300 characters."
              >
                <textarea
                  id="excerpt"
                  value={d.excerpt}
                  maxLength={300}
                  rows={3}
                  onChange={(e) => set('excerpt', e.target.value)}
                  className={areaField}
                />
              </Field>
              <div>
                <p className="label-mono mb-2 text-muted">Body (Markdown)</p>
                <MarkdownEditor
                  value={d.body_md}
                  onChange={(v) => set('body_md', v)}
                  error={err('body_md')}
                />
              </div>
            </>
          ) : null}
        </div>

        <aside className="space-y-6 lg:col-span-4" aria-label="Post settings">
          <section className="space-y-4 border border-line p-4" aria-labelledby="pub-h">
            <h2 id="pub-h" className="text-lg">
              Publishing
            </h2>
            <Field id="status" label="Status">
              <select
                id="status"
                value={d.status}
                onChange={(e) => set('status', e.target.value as Draft['status'])}
                className={field}
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published</option>
              </select>
            </Field>
            <Field
              id="publish-at"
              label="Publish at (optional)"
              hint="Leave empty to publish now. A future time schedules it."
              error={err('published_at')}
            >
              <input
                id="publish-at"
                type="datetime-local"
                value={d.published_at}
                onChange={(e) => set('published_at', e.target.value)}
                className={field}
              />
            </Field>
            {scheduled ? (
              <p className="label-mono text-landslide-ink">
                Scheduled: goes live at the time above.
              </p>
            ) : null}
            {!isUpdate ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={d.featured}
                  onChange={(e) => set('featured', e.target.checked)}
                  className="h-5 w-5 accent-[var(--signal)]"
                />
                <span>Feature on the news page and home</span>
              </label>
            ) : null}
          </section>

          <section className="space-y-4 border border-line p-4" aria-labelledby="meta-h">
            <h2 id="meta-h" className="text-lg">
              Details
            </h2>
            <Field id="category" label="Category">
              <select
                id="category"
                value={d.category}
                onChange={(e) => set('category', e.target.value as Draft['category'])}
                className={field}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field id="tags" label="Tags" hint="Comma separated, up to 8." error={err('tags')}>
              <input
                id="tags"
                value={d.tags}
                onChange={(e) => set('tags', e.target.value)}
                className={field}
              />
            </Field>
            <Field id="link" label="External link (optional)" error={err('link_url')}>
              <input
                id="link"
                type="url"
                value={d.link_url}
                placeholder="https://"
                onChange={(e) => set('link_url', e.target.value)}
                className={field}
              />
            </Field>
            {!isUpdate ? (
              <Field id="event" label="Event date (optional)" error={err('event_date')}>
                <input
                  id="event"
                  type="date"
                  value={d.event_date}
                  onChange={(e) => set('event_date', e.target.value)}
                  className={field}
                />
              </Field>
            ) : null}
          </section>

          <section className="space-y-4 border border-line p-4" aria-labelledby="cover-h">
            <h2 id="cover-h" className="text-lg">
              Cover image
            </h2>
            <ImageUploader
              value={{ path: d.cover_path, alt: d.cover_alt }}
              onChange={(v) => {
                setD((prev) => ({ ...prev, cover_path: v.path, cover_alt: v.alt }));
                setDirty(true);
              }}
              onError={(m) => toast.push(m, 'error')}
              altError={err('cover_alt')}
            />
            <p className="text-[0.9rem] text-muted">
              Without a cover, the site draws a road-network artwork from the slug.
            </p>
          </section>

          {id ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm('Delete this post for good?')) return;
                start(async () => {
                  const r = await deletePostAction(id);
                  if (r.ok) {
                    setDirty(false);
                    toast.push('Deleted.');
                    router.push('/admin');
                  } else toast.push(r.message, 'error');
                });
              }}
              className={buttonClass('danger', 'w-full')}
            >
              <Trash2 size={16} aria-hidden="true" /> Delete post
            </button>
          ) : null}
        </aside>
      </div>
    </form>
  );
}
