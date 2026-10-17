'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface TagOption {
  tag: string;
  href: string;
}

const MAX_SHOWN = 12;

/**
 * Tag filter for the news page. A long list of hashtags is hidden: type to find one, pick it, and the
 * page filters to it. The chosen tag shows as a chip that clears it.
 */
export function TagFilter({
  tags,
  active,
  clearHref,
}: {
  tags: TagOption[];
  active?: string;
  clearHref: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^#/, '');
    const pool = tags.filter((t) => t.tag !== active);
    return (needle ? pool.filter((t) => t.tag.includes(needle)) : pool).slice(0, MAX_SHOWN);
  }, [q, tags, active]);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href, { scroll: false });
  };

  if (tags.length === 0 && !active) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-sm">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={`Search ${tags.length} tags`}
          placeholder={`Search ${tags.length} tags`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setCursor((c) => Math.min(c + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && open && matches[cursor]) {
              e.preventDefault();
              go(matches[cursor].href);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="h-11 w-full rounded-sharp border border-line-strong bg-surface pl-9 pr-3 font-mono text-sm text-fg placeholder:text-muted"
        />
        {open && matches.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching tags"
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto border border-line-strong bg-bg shadow-[0_12px_32px_rgb(0_0_0/0.25)]"
          >
            {matches.map((t, i) => (
              <li key={t.tag} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(t.href)}
                  className={`flex min-h-11 w-full items-center px-3 text-left font-mono text-sm hover:bg-surface-2 ${
                    i === cursor ? 'bg-surface-2' : ''
                  }`}
                >
                  #{t.tag}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {open && q.trim() && matches.length === 0 ? (
          <p className="absolute inset-x-0 top-full z-30 mt-1 border border-line-strong bg-bg p-3 text-muted">
            No tag matches “{q.trim()}”.
          </p>
        ) : null}
      </div>
      {active ? (
        <button
          type="button"
          onClick={() => go(clearHref)}
          className="inline-flex min-h-11 items-center gap-2 rounded-sharp border border-signal bg-signal px-4 font-mono text-sm text-signal-fg"
        >
          #{active}
          <X size={14} aria-hidden="true" />
          <span className="sr-only">Clear this tag</span>
        </button>
      ) : null}
    </div>
  );
}
