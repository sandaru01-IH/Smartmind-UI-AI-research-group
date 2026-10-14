import { LOGO_NOTE, PARTNERS } from '@/content/partners';
import { Reveal } from '@/components/ui/reveal';

/** Typographic wall of partner names. No logos until each partner gives permission. */
export function PartnersWall({ showNote = false }: { showNote?: boolean }) {
  const groups = [
    { id: 'national', title: 'National', items: PARTNERS.filter((p) => p.kind === 'national') },
    { id: 'international', title: 'International', items: PARTNERS.filter((p) => p.kind === 'international') },
  ] as const;
  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <div key={group.id} className="grid-12 gap-y-4">
          <h3 className="label-mono col-span-12 text-muted md:col-span-3">
            {group.title} <span className="text-fg">({group.items.length})</span>
          </h3>
          <ul className="col-span-12 md:col-span-9">
            {group.items.map((p, i) => (
              <Reveal as="li" key={p.name} index={i} className="flex flex-wrap items-baseline justify-between gap-x-6 border-t border-line py-4 first:border-t-0 md:py-5">
                <span className="font-display text-xl tracking-tight md:text-2xl">{p.name}</span>
                {p.place ? <span className="label-mono text-muted">{p.place}</span> : null}
              </Reveal>
            ))}
          </ul>
        </div>
      ))}
      {showNote ? <p className="label-mono text-muted">{LOGO_NOTE}</p> : null}
    </div>
  );
}

/** Compact version for the home page: names set as one flowing typographic block per group. */
export function PartnersInline() {
  const groups = [
    { id: 'national', title: 'National', items: PARTNERS.filter((p) => p.kind === 'national') },
    { id: 'international', title: 'International', items: PARTNERS.filter((p) => p.kind === 'international') },
  ] as const;
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.id} className="grid-12 gap-y-3">
          <h3 className="label-mono col-span-12 text-muted md:col-span-3">{group.title}</h3>
          <ul className="col-span-12 flex flex-wrap gap-x-5 gap-y-2 font-display text-xl leading-snug tracking-tight md:col-span-9 md:text-2xl">
            {group.items.map((p) => (
              <li key={p.name} className="after:ml-5 after:text-line-strong after:content-['/'] last:after:content-none">
                {p.name}
                {p.place ? <span className="label-mono ml-2 text-muted">{p.place}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
