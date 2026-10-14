'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { t } from '@/content/strings';

export interface TickerItem {
  id: string;
  title: string;
  category: string;
  href: string | null;
  external: boolean;
  date: string | null;
}

const fmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const formatDate = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : '');

function Entry({ item }: { item: TickerItem }) {
  const body = (
    <>
      <span className="label-mono text-muted">{item.category}</span>
      <span>{item.title}</span>
      <time dateTime={item.date ?? undefined} className="label-mono text-muted">
        {formatDate(item.date)}
      </time>
    </>
  );
  const cls = 'inline-flex min-h-9 items-center gap-3 whitespace-nowrap px-6 text-sm';
  if (item.href && item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cls} hover:underline`}
      >
        {body}
        <span className="sr-only"> ({t.common.external})</span>
      </a>
    );
  }
  if (item.href) {
    return (
      <Link href={item.href} className={`${cls} hover:underline`}>
        {body}
      </Link>
    );
  }
  return <span className={cls}>{body}</span>;
}

/**
 * Slim "Latest" bar. The track scrolls with CSS only, pauses on hover and keyboard focus,
 * and has an explicit pause button. Under reduced motion it becomes a plain scrollable list.
 */
export function TickerView({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return null;

  // Repeat short lists so the track is always wider than the viewport.
  const repeats = Math.max(1, Math.ceil(8 / items.length));
  const group = Array.from({ length: repeats }, () => items).flat();

  return (
    <section aria-label={t.ticker.region} className="group/ticker border-b border-line bg-surface">
      <div className="container-site flex items-center gap-3">
        <p className="label-mono flex shrink-0 items-center gap-2 py-2 text-fg">
          <span className="live-dot" aria-hidden="true" />
          {t.ticker.live}
          <span className="sr-only">{t.ticker.label}</span>
        </p>
        <div
          className="relative min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2rem), transparent)',
          }}
        >
          <ul
            className="ticker-track flex w-max"
            data-paused={paused}
            style={{ '--ticker-dur': `${Math.max(30, group.length * 7)}s` } as CSSProperties}
          >
            {group.map((item, i) => (
              <li key={`a-${item.id}-${i}`}>
                <Entry item={item} />
              </li>
            ))}
            {/* Visual duplicate for the seamless loop. Hidden from assistive technology and the tab order. */}
            <li aria-hidden="true" className="flex" {...({ inert: true } as object)}>
              {group.map((item, i) => (
                <Entry key={`b-${item.id}-${i}`} item={item} />
              ))}
            </li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? t.ticker.play : t.ticker.pause}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sharp text-muted hover:text-fg motion-reduce:hidden"
        >
          {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
