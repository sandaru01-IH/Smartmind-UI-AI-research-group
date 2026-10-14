'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { t } from '@/content/strings';

export interface PaletteItem {
  id: string;
  group: 'pages' | 'news' | 'publications' | 'team';
  label: string;
  hint?: string;
  href: string;
  external?: boolean;
}

const GROUP_LABEL = {
  pages: t.palette.pages,
  news: t.palette.news,
  publications: t.palette.publications,
  team: t.palette.team,
} as const;

function score(item: PaletteItem, q: string): number {
  if (!q) return item.group === 'pages' ? 1 : 0;
  const hay = `${item.label} ${item.hint ?? ''}`.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.every((w) => hay.includes(w))) return -1;
  return item.label.toLowerCase().startsWith(words[0])
    ? 3
    : item.label.toLowerCase().includes(words[0])
      ? 2
      : 1;
}

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const ranked = items
      .map((item) => ({ item, s: score(item, query.trim()) }))
      .filter((r) => r.s >= (query.trim() ? 0 : 1))
      .sort((a, b) => b.s - a.s);
    return ranked.slice(0, 30).map((r) => r.item);
  }, [items, query]);

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    setQuery('');
    setActive(0);
    d.showModal();
    inputRef.current?.focus();
  }, []);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('[data-palette-open]')) open();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  const go = (item: PaletteItem) => {
    close();
    if (item.external) window.open(item.href, '_blank', 'noopener,noreferrer');
    else router.push(item.href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Home') {
      setActive(0);
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={t.palette.open}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className="m-auto mt-[12vh] w-[min(40rem,calc(100vw-2rem))] rounded-sharp border border-line-strong bg-surface p-0 text-fg backdrop:bg-black/60"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search size={18} aria-hidden="true" className="text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onInputKey}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          aria-label={t.palette.placeholder}
          placeholder={t.palette.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
        <kbd className="label-mono text-muted">Esc</kbd>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={t.palette.results}
        className="max-h-[50vh] overflow-y-auto p-2"
      >
        {results.length === 0 ? (
          <li role="presentation" className="px-3 py-6 text-center text-muted">
            {t.palette.empty}
          </li>
        ) : null}
        {results.map((item, i) => {
          const header =
            i === 0 || results[i - 1].group !== item.group ? GROUP_LABEL[item.group] : null;
          return (
            <li key={item.id} role="presentation">
              {header ? <p className="label-mono px-3 pb-1 pt-3 text-muted">{header}</p> : null}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => go(item)}
                onMouseMove={() => setActive(i)}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sharp px-3 py-2 aria-selected:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  {item.hint ? (
                    <span className="label-mono block truncate text-muted">{item.hint}</span>
                  ) : null}
                </span>
                {i === active ? (
                  <CornerDownLeft size={16} aria-hidden="true" className="shrink-0 text-muted" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
