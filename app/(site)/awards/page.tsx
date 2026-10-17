import Link from 'next/link';
import { Suspense } from 'react';
import { Award as AwardIcon, Medal, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { TbcFlag } from '@/components/ui/tag';
import { getAwards } from '@/lib/catalog/public';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Awards',
  description:
    'Awards won by the people of the Urban Simulation Lab and the Smartmind team, newest first.',
  path: '/awards',
});

/** Each award takes one research-theme colour in turn, so the timeline reads like a coloured transit map. */
const ACCENTS = [
  { fill: 'var(--flood)', ink: 'var(--flood-ink)' },
  { fill: 'var(--landslide)', ink: 'var(--landslide-ink)' },
  { fill: 'var(--traffic)', ink: 'var(--traffic-ink)' },
  { fill: 'var(--ai)', ink: 'var(--ai-ink)' },
] as const;
const ICONS = [Trophy, Medal, AwardIcon] as const;

async function Timeline() {
  const awards = await getAwards();
  if (awards.length === 0) {
    return (
      <p className="border border-dashed border-line-strong p-6 text-muted">
        Awards will appear here soon.
      </p>
    );
  }
  return (
    <ol className="relative mx-auto max-w-5xl">
      {/* The line every award sits on. */}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-5 top-0 w-px bg-gradient-to-b from-signal via-line-strong to-line lg:left-1/2"
      />
      {awards.map((a, i) => {
        const accent = ACCENTS[i % ACCENTS.length];
        const Icon = ICONS[i % ICONS.length];
        const left = i % 2 === 0;
        const when = a.when_label
          ? a.when_label.includes(String(a.year))
            ? a.when_label
            : `${a.year} · ${a.when_label}`
          : String(a.year);
        return (
          <Reveal
            as="li"
            key={a.id}
            index={i % 3}
            className="relative pb-10 pl-16 last:pb-0 lg:grid lg:grid-cols-2 lg:pb-14 lg:pl-0"
          >
            <span
              aria-hidden="true"
              className="absolute left-5 top-6 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-bg lg:left-1/2"
              style={{ borderColor: accent.fill, color: accent.ink }}
            >
              <Icon size={20} />
            </span>
            <article
              className={`group relative overflow-hidden border border-line bg-surface p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong md:p-8 ${
                left ? 'lg:col-start-1 lg:mr-14' : 'lg:col-start-2 lg:ml-14'
              }`}
              style={{ borderTop: `3px solid ${accent.fill}` }}
            >
              <p
                aria-hidden="true"
                className="numeral pointer-events-none absolute -right-2 -top-3 select-none text-8xl opacity-10 transition-opacity duration-300 group-hover:opacity-20 md:text-9xl"
                style={{ color: accent.fill }}
              >
                {a.year}
              </p>
              <div className="relative">
                <p className="label-mono" style={{ color: accent.ink }}>
                  {when}
                </p>
                <h2 className="mt-3 text-2xl">
                  {a.href ? (
                    <Link href={a.href} className="hover:underline">
                      {a.award}
                    </Link>
                  ) : (
                    a.award
                  )}
                </h2>
                {a.who ? <p className="mt-4 text-lg">{a.who}</p> : null}
                {a.event ? <p className="mt-1 text-muted">{a.event}</p> : null}
                {a.reason ? <p className="mt-1 text-muted">{a.reason}</p> : null}
                {a.tbc ? <TbcFlag className="mt-4" /> : null}
              </div>
            </article>
          </Reveal>
        );
      })}
    </ol>
  );
}

export default function AwardsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Awards"
        title="Recognised by peers"
        lead="Posters, papers and projects, honoured along the way. Entries still awaiting confirmation say so."
      />
      <div className="container-site pb-24">
        <Suspense
          fallback={<div className="h-96 border border-line bg-surface" aria-hidden="true" />}
        >
          <Timeline />
        </Suspense>
      </div>
    </>
  );
}
