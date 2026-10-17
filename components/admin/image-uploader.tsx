'use client';

import { useEffect, useId, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { IMAGE_TYPES } from '@/lib/schemas';
import { mediaUrl } from '@/lib/supabase/env';
import { uploadImage } from './upload-client';

export interface CoverValue {
  path: string | null;
  alt: string;
}

const field =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

/**
 * Cover image control. Checks type and size in the browser, uploads straight to Supabase Storage
 * through a one-use signed URL the server issued, then asks the server to verify the stored bytes.
 */
export function ImageUploader({
  value,
  onChange,
  onError,
  altError,
  name = 'cover',
  noun = 'cover image',
  showAlt = true,
  fit = 'cover',
}: {
  value: CoverValue;
  onChange: (next: CoverValue) => void;
  onError: (message: string) => void;
  altError?: string;
  name?: string;
  noun?: string;
  /** Logos are decorative next to the partner's name, so they need no description. */
  showAlt?: boolean;
  fit?: 'cover' | 'contain';
}) {
  const inputId = useId();
  const altId = useId();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const stored = mediaUrl(value.path);
  const shown = preview ?? stored;

  async function choose(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const res = await uploadImage(file);
    setBusy(false);
    if (!res.ok) return onError(res.message);
    setPreview(URL.createObjectURL(file));
    onChange({ path: res.path, alt: value.alt });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={`${name}_path`} value={value.path ?? ''} />
      <input type="hidden" name={`${name}_alt`} value={value.alt} />
      {shown ? (
        // A plain <img> is right here: the preview is a blob URL or a just-uploaded file.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shown}
          alt={value.alt || 'Cover preview'}
          className={`border border-line ${
            fit === 'contain'
              ? 'h-20 w-48 bg-surface object-contain p-2'
              : 'aspect-[16/9] w-full max-w-md object-cover'
          }`}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sharp border border-line-strong px-4 text-[0.95rem] font-semibold hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
        >
          {busy ? (
            <Loader2 size={16} aria-hidden="true" className="animate-spin" />
          ) : (
            <ImagePlus size={16} aria-hidden="true" />
          )}
          {value.path ? 'Replace image' : `Add ${noun}`}
          <input
            id={inputId}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {value.path ? (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onChange({ path: null, alt: '' });
            }}
            className="inline-flex min-h-11 items-center gap-2 px-3 text-[0.95rem] text-muted hover:text-fg"
          >
            <Trash2 size={16} aria-hidden="true" /> Remove
          </button>
        ) : null}
        <p className="label-mono text-muted">JPEG, PNG or WebP, up to 5 MB</p>
      </div>
      {value.path && showAlt ? (
        <div>
          <label htmlFor={altId} className="label-mono mb-2 block text-muted">
            Alt text (required)
          </label>
          <input
            id={altId}
            value={value.alt}
            onChange={(e) => onChange({ path: value.path, alt: e.target.value })}
            aria-invalid={altError ? true : undefined}
            aria-describedby={altError ? `${altId}-err` : undefined}
            maxLength={200}
            placeholder="Describe what the image shows"
            className={field}
          />
          {altError ? (
            <p id={`${altId}-err`} className="mt-1 text-[0.9rem] text-danger">
              {altError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
