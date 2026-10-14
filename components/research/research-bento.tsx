'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { THEMES, type ResearchTheme } from '@/content/research';
import { ThemePattern } from './theme-pattern';

const SPAN: Record<string, string> = {
  land: 'lg:col-span-7',
  flood: 'lg:col-span-5',
  traffic: 'lg:col-span-5',
  ai: 'lg:col-span-7',
};

function ThemeTile({ theme, index }: { theme: ResearchTheme; index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const colour = `var(${theme.colourVar})`;
  return (
    <article
      className={`group relative flex min-h-[22rem] flex-col justify-between overflow-hidden border border-line bg-surface p-6 transition-colors hover:border-line-strong md:p-8 ${SPAN[theme.id]}`}
      style={{ borderTopColor: colour, borderTopWidth: 2 }}
      data-open={open}
    >
      <ThemePattern
        theme={theme.id}
        colour={colour}
        className="pointer-events-none absolute -right-6 -top-4 h-48 w-80 opacity-60 transition-opacity duration-300 group-hover:opacity-90 group-data-[open=true]:opacity-90"
      />
      <div className="relative">
        <p className="numeral text-2xl text-line-strong">{String(index + 1).padStart(2, '0')}</p>
        <h3
          className="mt-3 max-w-[14ch] text-3xl md:text-4xl"
          style={{ color: `var(${theme.inkVar})` }}
        >
          {theme.title}
        </h3>
      </div>

      <div className="relative mt-10">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="label-mono inline-flex min-h-11 items-center gap-2 text-fg"
        >
          {theme.projects.length} projects
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {/* Projects are always in the DOM. They reveal on hover and focus for pointers, and on toggle for everyone. */}
        <ul
          id={panelId}
          className={`mt-2 space-y-3 overflow-hidden transition-[max-height,opacity] duration-300 [@media(hover:hover)]:max-h-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:max-h-96 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:max-h-96 [@media(hover:hover)]:group-focus-within:opacity-100 ${
            open ? '!max-h-96 !opacity-100' : ''
          }`}
        >
          {theme.projects.map((p) => (
            <li
              key={p.title}
              className="flex items-start gap-3 border-t border-line pt-3 text-[0.95rem]"
            >
              <span>{p.title}</span>
              {p.srcFunded ? <Tag className="shrink-0">SRC-funded</Tag> : null}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** Four themes in a bento grid. Each has its theme colour, a generative pattern and its projects. */
export function ResearchBento() {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {THEMES.map((theme, i) => (
        <ThemeTile key={theme.id} theme={theme} index={i} />
      ))}
    </div>
  );
}
