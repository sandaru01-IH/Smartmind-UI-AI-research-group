'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { ExternalLink } from '@/components/ui/external-link';
import { Tag, TbcFlag } from '@/components/ui/tag';
import { t } from '@/content/strings';
import { filterPublications, type PublicationFilters } from '@/lib/publications-filter';
import { PUB_KIND_LABEL, type Publication } from '@/lib/catalog/types';

const field =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

export function PublicationsExplorer({ publications }: { publications: Publication[] }) {
  const [filters, setFilters] = useState<PublicationFilters>({ q: '', year: 'all', venue: 'all' });
  const years = useMemo(
    () => Array.from(new Set(publications.map((p) => p.year))).sort((a, b) => b - a),
    [publications],
  );
  const venues = useMemo(
    () => Array.from(new Set(publications.map((p) => p.venue))).sort((a, b) => a.localeCompare(b)),
    [publications],
  );
  const results = useMemo(() => filterPublications(publications, filters), [publications, filters]);
  const active = filters.q !== '' || filters.year !== 'all' || filters.venue !== 'all';

  return (
    <div>
      <form
        role="search"
        aria-label="Filter publications"
        className="grid gap-4 md:grid-cols-12"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="md:col-span-5">
          <label htmlFor="pub-q" className="label-mono mb-2 block text-muted">
            {t.common.search}
          </label>
          <div className="relative">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="pub-q"
              type="search"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Title, venue or author"
              className={`${field} pl-9`}
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="pub-year" className="label-mono mb-2 block text-muted">
            Year
          </label>
          <select
            id="pub-year"
            value={filters.year}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                year: e.target.value === 'all' ? 'all' : Number(e.target.value),
              }))
            }
            className={field}
          >
            <option value="all">{t.common.all}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-5">
          <label htmlFor="pub-venue" className="label-mono mb-2 block text-muted">
            Venue
          </label>
          <select
            id="pub-venue"
            value={filters.venue}
            onChange={(e) => setFilters((f) => ({ ...f, venue: e.target.value }))}
            className={field}
          >
            <option value="all">{t.common.all}</option>
            {venues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p role="status" aria-live="polite" className="label-mono text-muted">
          {results.length} of {publications.length} publications
        </p>
        {active ? (
          <button
            type="button"
            onClick={() => setFilters({ q: '', year: 'all', venue: 'all' })}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {t.common.clear}
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <p className="mt-10 text-lg text-muted">{t.common.noResults}</p>
      ) : (
        <ol className="mt-4 border-t border-line">
          {results.map((p) => (
            <li key={p.id} className="grid-12 gap-y-2 border-b border-line py-6">
              <p className="numeral col-span-12 text-3xl text-muted md:col-span-2">{p.year}</p>
              <div className="col-span-12 md:col-span-10">
                <h3 className="text-xl leading-snug md:text-2xl">
                  {p.href?.startsWith('/') ? (
                    <Link href={p.href} className="hover:underline">
                      {p.title}
                    </Link>
                  ) : p.href ? (
                    <ExternalLink href={p.href} className="hover:underline">
                      {p.title}
                    </ExternalLink>
                  ) : (
                    p.title
                  )}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {p.kind !== 'paper' && !p.fromPost ? <Tag>{PUB_KIND_LABEL[p.kind]}</Tag> : null}
                  {p.venue ? <p className="label-mono text-muted">{p.venue}</p> : null}
                </div>
                {p.authors ? <p className="mt-2 text-[0.95rem] text-muted">{p.authors}</p> : null}
                {p.tbc ? <TbcFlag className="mt-3" /> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
