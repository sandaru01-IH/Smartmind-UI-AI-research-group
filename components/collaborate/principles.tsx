import { PILLARS } from '@/content/philosophy';

/** The three shared principles as three quiet rows, followed by the closing line. */
export function PhilosophyPrinciples({ closing }: { closing: string }) {
  return (
    <div>
      <ul className="border-t border-line">
        {Object.values(PILLARS).map((p) => (
          <li key={p.key} className="grid-12 items-baseline gap-y-1 border-b border-line py-5">
            <span className="label-mono col-span-12 text-muted md:col-span-3">{p.label}</span>
            <span className="col-span-12 font-display text-2xl md:col-span-9">{p.headline}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-[58ch] text-xl">{closing}</p>
    </div>
  );
}
