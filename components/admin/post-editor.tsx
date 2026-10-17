'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Eye, Loader2, Save, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { deletePostAction, savePostAction } from '@/app/admin/actions';
import { buttonClass } from '@/components/ui/button';
import { TbcFlag } from '@/components/ui/tag';
import { fromLocalInput, toLocalInput } from '@/lib/datetime';
import type { Post } from '@/lib/posts/types';
import {
  CATEGORIES,
  PLATFORMS,
  PLATFORM_LABEL,
  TITLE_MAX,
  UPDATE_HEADLINE_MAX,
  postInputSchema,
  type Platform,
} from '@/lib/schemas';
import { isValidSlug, slugify } from '@/lib/slug';
import { GalleryPhotos } from './gallery-photos';
import { ImageUploader } from './image-uploader';
import { MarkdownEditor } from './markdown-editor';
import { PeoplePicker, type PersonOption } from './people-picker';
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
  show_in_news: boolean;
  show_in_ticker: boolean;
  in_gallery: boolean;
  in_publications: boolean;
  in_awards: boolean;
  tbc: boolean;
  video_url: string;
  gallery_paths: string[];
  external_links: { platform: Platform; url: string }[];
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
  show_in_news: true,
  show_in_ticker: type === 'update',
  in_gallery: false,
  in_publications: false,
  in_awards: false,
  tbc: false,
  video_url: '',
  gallery_paths: [],
  external_links: [],
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
  show_in_news: p.show_in_news,
  show_in_ticker: p.show_in_ticker,
  in_gallery: p.in_gallery,
  in_publications: p.in_publications,
  in_awards: p.in_awards,
  tbc: p.tbc,
  video_url: p.video_url ?? '',
  gallery_paths: p.gallery_paths,
  external_links: p.external_links,
});

const toValues = (d: Draft) => ({
  ...d,
  tags: d.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  published_at: fromLocalInput(d.published_at),
  video_url: d.video_url.trim(),
  external_links: d.external_links.filter((l) => l.url.trim() !== ''),
});

/** True when the draft is set to publish at a time that has not arrived yet. */
function isFutureSchedule(d: Draft): boolean {
  const at = fromLocalInput(d.published_at);
  return d.status === 'published' && at !== null && new Date(at).getTime() > Date.now();
}

const FIELD_LABEL: Record<string, string> = {
  title: 'Title',
  slug: 'Slug',
  excerpt: 'Excerpt',
  body_md: 'Body',
  cover_path: 'Thumbnail image',
  cover_alt: 'Thumbnail description',
  link_url: 'External link',
  video_url: 'Video link',
  external_links: 'Read more links',
  gallery_paths: 'Gallery photos',
  event_date: 'Event date',
  published_at: 'Publish at',
  tags: 'Tags',
};

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

export function PostEditor({
  post,
  people = [],
  linkedPeople = [],
}: {
  post: Post | null;
  /** Everyone who can be linked to this post. */
  people?: PersonOption[];
  /** Ids of the people already linked. */
  linkedPeople?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [id, setId] = useState<string | null>(post?.id ?? null);
  const [d, setD] = useState<Draft>(post ? fromPost(post) : blank('article'));
  const [linked, setLinked] = useState<string[]>(linkedPeople);
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
  const latest = useRef({ d, id, linked });
  useEffect(() => {
    latest.current = { d, id, linked };
  });

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
  const needsThumbnail = d.status === 'published' && d.type === 'article' && !d.cover_path;

  const save = useCallback(
    async (opts: { silent?: boolean } = {}): Promise<boolean> => {
      const { d: cur, id: curId, linked: curPeople } = latest.current;
      // Check in the browser first, so the author is told exactly what is missing.
      const check = postInputSchema.safeParse(toValues(cur));
      if (!check.success) {
        setErrors(z.flattenError(check.error).fieldErrors as Record<string, string[]>);
        if (!opts.silent) {
          const first = check.error.issues[0];
          toast.push(`Can't save yet: ${first.message}.`, 'error');
        }
        return false;
      }
      setSaving(true);
      const res = await savePostAction({
        id: curId,
        values: toValues(cur),
        people: curPeople,
      });
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
        toast.push(
          cur.status !== 'published'
            ? 'Draft saved.'
            : cur.cover_path || cur.type === 'update'
              ? 'Posted!'
              : 'Posted! Tip: add a thumbnail so it stands out in News, Home and the Gallery.',
        );
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
                : dirty
                  ? 'Unsaved changes. The preview shows the last saved version.'
                  : savedAt
                    ? `Saved ${savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                    : 'No changes'}
            </p>
            {d.tbc ? <TbcFlag /> : null}
            {needsThumbnail ? (
              <p role="status" className="label-mono text-landslide-ink">
                {savedAt && !dirty
                  ? 'Posted! Add a thumbnail any time to make it stand out.'
                  : 'No thumbnail yet. Add one to make this stand out, or publish without it.'}
              </p>
            ) : null}
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
          <button type="submit" disabled={saving} className={buttonClass('primary')}>
            {saving ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            Save
          </button>
        </div>
      </div>

      {Object.keys(errors).length > 0 ? (
        <div role="alert" className="border border-danger p-4">
          <p className="font-semibold text-danger">This post can&rsquo;t be saved yet:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(errors).map(([field, msgs]) => (
              <li key={field}>
                <span className="font-semibold">{FIELD_LABEL[field] ?? field}:</span> {msgs[0]}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
                  onChange={() => {
                    set('type', t);
                    set('show_in_news', true);
                    set('show_in_ticker', t === 'update');
                    if (t === 'update') set('in_gallery', false);
                  }}
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

              {d.in_gallery ? (
                <section className="space-y-5 border border-line p-4" aria-labelledby="moment-h">
                  <h2 id="moment-h" className="text-lg">
                    Gallery moment
                  </h2>
                  <Field
                    id="video"
                    label="Video link (optional)"
                    hint="A YouTube or Vimeo link, for example the recording of a talk. It plays on the gallery page."
                    error={err('video_url')}
                  >
                    <input
                      id="video"
                      type="url"
                      value={d.video_url}
                      placeholder="https://www.youtube.com/watch?v="
                      onChange={(e) => set('video_url', e.target.value)}
                      className={field}
                    />
                  </Field>
                  <div>
                    <p className="label-mono mb-2 text-muted">More photos</p>
                    <GalleryPhotos
                      value={d.gallery_paths}
                      onChange={(v) => set('gallery_paths', v)}
                      onError={(m) => toast.push(m, 'error')}
                    />
                  </div>
                </section>
              ) : null}

              <section className="space-y-4 border border-line p-4" aria-labelledby="ext-h">
                <h2 id="ext-h" className="text-lg">
                  Read more elsewhere
                </h2>
                <p className="text-[0.9rem] text-muted">
                  Link the same story on Medium, LinkedIn or another platform for further reading.
                </p>
                {d.external_links.map((l, i) => (
                  <div key={i} className="flex flex-wrap gap-2">
                    <select
                      aria-label={`Platform for link ${i + 1}`}
                      value={l.platform}
                      onChange={(e) =>
                        set(
                          'external_links',
                          d.external_links.map((x, j) =>
                            j === i ? { ...x, platform: e.target.value as Platform } : x,
                          ),
                        )
                      }
                      className={`${field} w-40`}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {PLATFORM_LABEL[p]}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Address for link ${i + 1}`}
                      type="url"
                      placeholder="https://"
                      value={l.url}
                      onChange={(e) =>
                        set(
                          'external_links',
                          d.external_links.map((x, j) =>
                            j === i ? { ...x, url: e.target.value } : x,
                          ),
                        )
                      }
                      className={`${field} min-w-0 flex-1 basis-56`}
                    />
                    <button
                      type="button"
                      aria-label={`Remove link ${i + 1}`}
                      onClick={() =>
                        set(
                          'external_links',
                          d.external_links.filter((_, j) => j !== i),
                        )
                      }
                      className={buttonClass('ghost', '', 'icon')}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {err('external_links') ? (
                  <p className="text-[0.9rem] text-danger">{err('external_links')}</p>
                ) : null}
                {d.external_links.length < 6 ? (
                  <button
                    type="button"
                    onClick={() =>
                      set('external_links', [...d.external_links, { platform: 'medium', url: '' }])
                    }
                    className={buttonClass('secondary', '', 'sm')}
                  >
                    Add a link
                  </button>
                ) : null}
              </section>
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
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={d.tbc}
                onChange={(e) => set('tbc', e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--signal)]"
              />
              <span>
                To be confirmed
                <span className="block text-[0.9rem] text-muted">
                  Visitors see a “To be confirmed” flag everywhere this appears. Untick it once it
                  is confirmed and the flag goes away across the whole site.
                </span>
              </span>
            </label>
          </section>

          {!isUpdate ? (
            <section className="space-y-3 border border-line p-4" aria-labelledby="where-h">
              <h2 id="where-h" className="text-lg">
                Where it appears
              </h2>
              <p className="text-[0.9rem] text-muted">
                Tick every place this belongs. Choosing the Award or Publication category ticks it
                for you, and a post can be an award and a publication at once.
              </p>
              {(
                [
                  ['show_in_news', 'In the news section'],
                  ['show_in_ticker', 'Roll in the “now” ticker at the top of every page'],
                  ['in_gallery', 'In the gallery, as a moment'],
                  ['in_publications', 'On the publications page (a paper, poster or report)'],
                  ['in_awards', 'On the awards page (an award or recognition)'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={d[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[var(--signal)]"
                  />
                  <span>{label}</span>
                </label>
              ))}
              <p className="text-[0.9rem] text-muted">
                The home page always shows the newest news items with their thumbnails.
              </p>
            </section>
          ) : null}

          <section className="space-y-3 border border-line p-4" aria-labelledby="people-h">
            <h2 id="people-h" className="text-lg">
              People
            </h2>
            <p className="text-[0.9rem] text-muted">
              Whoever you tick gets this on their team profile, and people who share work are
              connected on the team page automatically.
            </p>
            <PeoplePicker
              options={people}
              value={linked}
              onChange={(v) => {
                setLinked(v);
                setDirty(true);
              }}
            />
          </section>

          <section className="space-y-4 border border-line p-4" aria-labelledby="meta-h">
            <h2 id="meta-h" className="text-lg">
              Details
            </h2>
            <Field id="category" label="Category">
              <select
                id="category"
                value={d.category}
                onChange={(e) => {
                  const category = e.target.value as Draft['category'];
                  set('category', category);
                  // A post can be several things at once, so picking a category only adds ticks.
                  if (category === 'Award') set('in_awards', true);
                  if (category === 'Publication') set('in_publications', true);
                }}
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
              Thumbnail image
            </h2>
            <ImageUploader
              value={{ path: d.cover_path, alt: d.cover_alt }}
              onChange={(v) => {
                setD((prev) => ({ ...prev, cover_path: v.path, cover_alt: v.alt }));
                setDirty(true);
              }}
              onError={(m) => toast.push(m, 'error')}
              altError={err('cover_alt')}
              noun="thumbnail"
            />
            {err('cover_path') ? (
              <p className="text-[0.9rem] text-danger">{err('cover_path')}</p>
            ) : (
              <p className="text-[0.9rem] text-muted">
                {isUpdate
                  ? 'Optional for ticker updates.'
                  : 'Recommended, not required. It is the card people see on the home page, news and gallery. Without one the site draws cover art.'}
              </p>
            )}
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
