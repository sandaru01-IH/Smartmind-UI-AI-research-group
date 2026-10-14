import { MILESTONES } from '@/content/chatbots';
import { confirmedOnly } from '@/content/types';
import { Reveal } from '@/components/ui/reveal';

/** Home teaser. Confirmed milestones only: LinkedIn-sourced items stay on /chatbots with their flag. */
export function JourneyTeaser() {
  const items = confirmedOnly(MILESTONES);
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
            <p className="label-mono text-muted">{m.when}</p>
            <h3 className="mt-2 text-xl md:text-2xl">{m.title}</h3>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
