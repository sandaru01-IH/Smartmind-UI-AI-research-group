import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/ui/reveal';
import { Tag, TbcFlag } from '@/components/ui/tag';
import type { FeaturedItem } from '@/lib/catalog/types';
import { mediaUrl } from '@/lib/supabase/env';

/** The figure the admin uploaded, or a quiet placeholder with the year until there is one. */
function Figure({
  item,
  sizes,
  className,
}: {
  item: FeaturedItem;
  sizes: string;
  className: string;
}) {
  const src = mediaUrl(item.figure_path);
  return (
    <figure className={`relative m-0 overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={item.figure_caption || `Figure from ${item.title}`}
          fill
          sizes={sizes}
          className="object-contain p-2"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--signal) 14%, transparent), transparent 55%), linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
          }}
        >
          <span className="numeral text-6xl text-line-strong">{item.year}</span>
        </div>
      )}
    </figure>
  );
}

function Card({
  item,
  index,
  lead,
  full,
}: {
  item: FeaturedItem;
  index: number;
  lead: boolean;
  full: boolean;
}) {
  const clamp = full ? '' : lead ? 'line-clamp-4' : 'line-clamp-3';
  return (
    <Reveal
      as="article"
      index={index}
      className={`group flex flex-col border border-line bg-surface transition-colors duration-300 hover:border-line-strong ${
        lead ? 'md:col-span-3 md:flex-row' : ''
      }`}
    >
      <Figure
        item={item}
        sizes={lead ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 33vw, 100vw'}
        className={lead ? 'aspect-[16/10] md:aspect-auto md:min-h-72 md:w-1/2' : 'aspect-[16/10]'}
      />
      <div className={`flex flex-1 flex-col gap-3 p-5 md:p-6 ${lead ? 'md:w-1/2' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Tag theme={item.kind === 'project' ? 'flood' : 'ai'}>
            {item.kind === 'project' ? 'Project' : 'Paper'}
          </Tag>
          <span className="numeral text-sm text-muted">{item.year}</span>
          {item.venue ? <span className="label-mono text-muted">{item.venue}</span> : null}
          {item.tbc ? <TbcFlag /> : null}
        </div>
        <h3 className={lead ? 'text-2xl md:text-3xl' : 'text-xl'}>{item.title}</h3>
        {item.summary ? <p className={`text-muted ${clamp}`}>{item.summary}</p> : null}
        {item.key_partners ? (
          <p className="label-mono mt-auto border-t border-line pt-3 text-muted">
            {item.key_partners}
          </p>
        ) : null}
        {item.href ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 self-start underline underline-offset-4"
          >
            {item.kind === 'project' ? 'Learn more' : 'Read the paper'}
            <ArrowUpRight size={14} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </Reveal>
  );
}

/**
 * Key papers and projects. The first item leads across the full width; on the home page summaries
 * are shortened, and on the research page every summary is shown in full.
 */
export function FeaturedResearch({
  items,
  full = false,
}: {
  items: FeaturedItem[];
  full?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {items.map((item, i) => (
        <Card key={item.id} item={item} index={i % 6} lead={i === 0} full={full} />
      ))}
    </div>
  );
}
