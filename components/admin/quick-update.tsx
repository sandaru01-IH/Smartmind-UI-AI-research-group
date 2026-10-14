'use client';

import { useRef, useState, useTransition } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { quickUpdateAction } from '@/app/admin/actions';
import { buttonClass } from '@/components/ui/button';
import { CATEGORIES, UPDATE_HEADLINE_MAX } from '@/lib/schemas';
import { ImageUploader, type CoverValue } from './image-uploader';
import { useToast } from './toast';

const field =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

/** One-click short update. Publishes immediately and feeds the ticker and the Latest strip. */
export function QuickUpdate() {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [state, setState] = useState<{
    ok?: boolean;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  }>({});
  const [headline, setHeadline] = useState('');
  const [cover, setCover] = useState<CoverValue>({ path: null, alt: '' });
  const [showImage, setShowImage] = useState(false);
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(async () => {
      const result = await quickUpdateAction({}, data);
      setState(result);
      if (result.ok) {
        toast.push('Published. It is live in the ticker now.');
        setHeadline('');
        setCover({ path: null, alt: '' });
        setShowImage(false);
        formRef.current?.reset();
      } else if (result.error) {
        toast.push(result.error, 'error');
      }
    });
  }

  const left = UPDATE_HEADLINE_MAX - headline.length;

  return (
    <section
      aria-labelledby="quick-title"
      className="border border-line-strong bg-surface p-5 md:p-6"
    >
      <h2 id="quick-title" className="flex items-center gap-2 text-xl">
        <Zap size={18} aria-hidden="true" className="text-flood-ink" /> Quick update
      </h2>
      <p className="mt-1 text-[0.95rem] text-muted">
        A short “something just happened” line. It goes live straight away.
      </p>
      <form ref={formRef} onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="qu-title" className="label-mono mb-2 block text-muted">
            Headline
          </label>
          <input
            id="qu-title"
            name="title"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={UPDATE_HEADLINE_MAX}
            required
            placeholder="What just happened?"
            aria-describedby="qu-count"
            className={field}
          />
          <p
            id="qu-count"
            className={`label-mono mt-1 ${left < 20 ? 'text-danger' : 'text-muted'}`}
          >
            {left} characters left
          </p>
          {state.fieldErrors?.title ? (
            <p className="mt-1 text-[0.9rem] text-danger">{state.fieldErrors.title[0]}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="qu-link" className="label-mono mb-2 block text-muted">
              Link (optional)
            </label>
            <input
              id="qu-link"
              name="link_url"
              type="url"
              placeholder="https://"
              className={field}
            />
            {state.fieldErrors?.link_url ? (
              <p className="mt-1 text-[0.9rem] text-danger">{state.fieldErrors.link_url[0]}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="qu-cat" className="label-mono mb-2 block text-muted">
              Category
            </label>
            <select id="qu-cat" name="category" defaultValue="News" className={field}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        {showImage ? (
          <ImageUploader
            value={cover}
            onChange={setCover}
            onError={(m) => toast.push(m, 'error')}
            altError={state.fieldErrors?.cover_alt?.[0]}
            name="cover"
          />
        ) : null}
        {/* The uploader writes cover_path and cover_alt as hidden inputs named cover_path / cover_alt. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="submit"
            disabled={pending || headline.trim().length < 3}
            className={buttonClass('primary')}
          >
            {pending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
            Publish update
          </button>
          {showImage ? null : (
            <button
              type="button"
              onClick={() => setShowImage(true)}
              className="min-h-11 text-[0.95rem] underline underline-offset-4"
            >
              Add an image
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
