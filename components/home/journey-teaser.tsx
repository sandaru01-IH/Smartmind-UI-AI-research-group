import { Reveal } from '@/components/ui/reveal';
import type { Milestone } from '@/lib/catalog/types';

/** Home teaser. Confirmed milestones only: anything still to be confirmed stays on the research page with its flag. */
export function JourneyTeaser({ milestones }: { milestones: Milestone[] }) {
  const items = milestones.filter((m) => !m.tbc);
  return (
    <ol className="border-t border-line">
      {items.map((m, i) => (
        <Reveal
          as="li"
          key={m.id}
          index={i}
          className="grid-12 items-baseline gap-y-2 border-b border-line py-6 md:py-8"
        >
          <p className="numeral col-span-12 text-4xl text-fg md:col-span-3 md:text-5xl">{m.year}</p>
          <div className="col-span-12 md:col-span-9">
            <p className="label-mono text-muted">{m.when_label || m.year}</p>
            <h3 className="mt-2 text-xl md:text-2xl">{m.title}</h3>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
