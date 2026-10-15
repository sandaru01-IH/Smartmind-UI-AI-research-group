import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/ui/reveal';
import type { Partner } from '@/content/partners';
import { t } from '@/content/strings';

// Grey and quiet until hovered or focused, so a long list of partners sits calmly at the foot of the page.
const TILE =
  'group block h-full border border-line bg-surface text-muted grayscale transition-[filter,color,border-color] duration-300 hover:border-line-strong hover:text-fg hover:grayscale-0 focus-visible:text-fg focus-visible:grayscale-0';

function Tile({ partner, index }: { partner: Partner; index: number }) {
  const inner = (
    <>
      <span className="relative flex h-24 items-center justify-center border-b border-line px-4 md:h-28">
        {partner.logo ? (
          <Image
            src={partner.logo}
            alt=""
            width={160}
            height={64}
            className="max-h-14 w-auto object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="max-w-full truncate font-display text-[1.6rem] leading-none tracking-tight"
          >
            {partner.short}
          </span>
        )}
        {partner.url ? (
          <ArrowUpRight
            size={16}
            aria-hidden="true"
            className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        ) : null}
      </span>
      <span className="block p-4 text-[0.9rem] leading-snug">
        {partner.name}
        {partner.place ? <span className="label-mono mt-1 block">{partner.place}</span> : null}
      </span>
    </>
  );
  return (
    <Reveal as="li" index={index % 6}>
      {partner.url ? (
        <a href={partner.url} target="_blank" rel="noopener noreferrer" className={TILE}>
          {inner}
          <span className="sr-only"> ({t.common.external})</span>
        </a>
      ) : (
        <div className={TILE}>{inner}</div>
      )}
    </Reveal>
  );
}

/** The partner wall: grey logo tiles with the name underneath, each linking to the partner's website. */
export function PartnerLogos({ partners }: { partners: readonly Partner[] }) {
  const groups = [
    { id: 'national', title: 'National' },
    { id: 'international', title: 'International' },
  ] as const;
  return (
    <div className="space-y-12">
      {groups.map((g) => {
        const items = partners.filter((p) => p.kind === g.id);
        return (
          <div key={g.id}>
            <h3 className="label-mono mb-4 text-muted">
              {g.title} <span className="text-fg">({items.length})</span>
            </h3>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {items.map((p, i) => (
                <Tile key={p.name} partner={p} index={i} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
