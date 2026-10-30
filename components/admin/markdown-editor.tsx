'use client';

import { useId, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
} from 'lucide-react';
import { PostBody } from '@/components/ui/markdown';
import type { UploadResult } from './upload-client';
import { applyFormat, type FormatKind } from '@/lib/markdown-edit';

const TOOLS: { kind: FormatKind; label: string; icon: typeof Bold }[] = [
  { kind: 'h2', label: 'Heading', icon: Heading2 },
  { kind: 'bold', label: 'Bold', icon: Bold },
  { kind: 'italic', label: 'Italic', icon: Italic },
  { kind: 'link', label: 'Link', icon: Link2 },
  { kind: 'ul', label: 'Bulleted list', icon: List },
  { kind: 'ol', label: 'Numbered list', icon: ListOrdered },
  { kind: 'quote', label: 'Quote', icon: Quote },
  { kind: 'code', label: 'Code', icon: Code },
];

/** Markdown editor with a formatting toolbar and a live preview that uses the public renderer. */
export function MarkdownEditor({
  value,
  onChange,
  error,
  onUploadImage,
  renderPreview,
  imageAltText = 'Describe this image',
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  /** When given, the toolbar gets an image button: the file is stored, then linked into the text. */
  onUploadImage?: (file: File) => Promise<UploadResult & { url?: string }>;
  /** Replaces the preview renderer (community posts allow images; news posts do not). */
  renderPreview?: (source: string) => React.ReactNode;
  imageAltText?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileId = useId();

  const format = (kind: FormatKind) => {
    const el = ref.current;
    if (!el) return;
    const r = applyFormat(value, el.selectionStart, el.selectionEnd, kind);
    onChange(r.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  };

  const insertImage = async (file: File | undefined) => {
    if (!file || !onUploadImage) return;
    setUploading(true);
    setUploadError(null);
    const res = await onUploadImage(file);
    setUploading(false);
    if (!res.ok) return setUploadError(res.message);
    const el = ref.current;
    const at = el ? el.selectionStart : value.length;
    const mark = `![${imageAltText}](${res.url ?? res.path})`;
    const pad = at > 0 && value[at - 1] !== '\n' ? '\n\n' : '';
    onChange(`${value.slice(0, at)}${pad}${mark}\n\n${value.slice(at)}`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border border-b-0 border-line-strong bg-surface p-1">
        <div role="toolbar" aria-label="Formatting" aria-controls={id} className="flex flex-wrap">
          {TOOLS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => format(kind)}
              disabled={tab === 'preview'}
              aria-label={label}
              title={label}
              className="inline-flex h-11 w-11 items-center justify-center rounded-sharp text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40"
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          ))}
          {onUploadImage ? (
            <label
              htmlFor={fileId}
              title="Insert image"
              className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-sharp text-muted hover:bg-surface-2 hover:text-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${tab === 'preview' ? 'pointer-events-none opacity-40' : ''}`}
            >
              {uploading ? (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              ) : (
                <ImagePlus size={16} aria-hidden="true" />
              )}
              <span className="sr-only">Insert image</span>
              <input
                id={fileId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading || tab === 'preview'}
                onChange={(e) => {
                  void insertImage(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>
          ) : null}
        </div>
        <div role="tablist" aria-label="Editor view" className="flex lg:hidden">
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`inline-flex min-h-11 items-center px-4 text-[0.95rem] capitalize ${tab === t ? 'bg-surface-2 font-semibold' : 'text-muted'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid border border-line-strong lg:grid-cols-2">
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Body (Markdown)"
          aria-invalid={error ? true : undefined}
          spellCheck
          className={`min-h-[22rem] w-full resize-y bg-surface p-4 font-mono text-[0.95rem] leading-relaxed text-fg ${tab === 'preview' ? 'hidden lg:block' : ''}`}
        />
        <div
          aria-label="Preview"
          className={`min-h-[22rem] overflow-auto border-line-strong p-4 lg:border-l ${tab === 'write' ? 'hidden lg:block' : ''}`}
        >
          {value.trim() ? (
            renderPreview ? (
              renderPreview(value)
            ) : (
              <PostBody source={value} />
            )
          ) : (
            <p className="text-muted">Nothing to preview yet.</p>
          )}
        </div>
      </div>
      {uploadError ? <p className="mt-1 text-[0.9rem] text-danger">{uploadError}</p> : null}
      {error ? <p className="mt-1 text-[0.9rem] text-danger">{error}</p> : null}
    </div>
  );
}
