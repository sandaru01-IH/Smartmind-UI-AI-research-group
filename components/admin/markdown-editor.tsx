'use client';

import { useId, useRef, useState } from 'react';
import { Bold, Code, Heading2, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react';
import { PostBody } from '@/components/ui/markdown';
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
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [tab, setTab] = useState<'write' | 'preview'>('write');

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
            <PostBody source={value} />
          ) : (
            <p className="text-muted">Nothing to preview yet.</p>
          )}
        </div>
      </div>
      {error ? <p className="mt-1 text-[0.9rem] text-danger">{error}</p> : null}
    </div>
  );
}
