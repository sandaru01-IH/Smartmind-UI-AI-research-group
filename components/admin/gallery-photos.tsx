'use client';

import { useId, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { IMAGE_TYPES } from '@/lib/schemas';
import { mediaUrl } from '@/lib/supabase/env';
import { uploadImage } from './upload-client';

const MAX = 12;

/** A small row of extra photos for a gallery moment. Each upload is verified by the server. */
export function GalleryPhotos({
  value,
  onChange,
  onError,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onError: (message: string) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let next = value;
    for (const file of Array.from(files)) {
      if (next.length >= MAX) {
        onError(`Use at most ${MAX} photos.`);
        break;
      }
      const res = await uploadImage(file);
      if (!res.ok) onError(res.message);
      else next = [...next, res.path];
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {value.map((path, i) => (
            <li key={path} className="relative aspect-square border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(path) ?? ''}
                alt={`Gallery photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onChange(value.filter((p) => p !== path))}
                className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-sharp bg-bg/90 text-fg"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label
        htmlFor={inputId}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sharp border border-line-strong px-4 text-[0.95rem] font-semibold hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
      >
        {busy ? (
          <Loader2 size={16} aria-hidden="true" className="animate-spin" />
        ) : (
          <ImagePlus size={16} aria-hidden="true" />
        )}
        Add photos
        <input
          id={inputId}
          type="file"
          multiple
          accept={IMAGE_TYPES.join(',')}
          className="sr-only"
          disabled={busy || value.length >= MAX}
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      <p className="label-mono text-muted">
        {value.length} of {MAX} · JPEG, PNG or WebP, up to 5 MB each
      </p>
    </div>
  );
}
