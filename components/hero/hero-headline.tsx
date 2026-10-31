import { IDENTITY, splitIdentityLine } from '@/content/philosophy';
import { RollingHeadline } from './rolling-headline';

const words = (text: string) => text.split(' ');

/**
 * The home headline: the identity sentence, word for word, set in three tiers so it reads as a
 * statement instead of a paragraph. The lead is the display line, the supporting clause is quieter,
 * and the closing phrase sits in the site's lime highlight. All of it stays one sentence inside one
 * h1, and the words still roll in one after another across the tiers.
 */
export function HeroHeadline() {
  const parts = splitIdentityLine(IDENTITY.line);
  if (!parts) {
    return (
      <h1
        id="hero-title"
        className="mt-5 max-w-[30ch] text-[length:var(--text-headline)] leading-[1.08]"
      >
        <RollingHeadline words={words(IDENTITY.line)} />
      </h1>
    );
  }

  const lead = words(parts.lead);
  const middle = words(parts.middle);
  const connector = words(parts.connector);
  const close = words(parts.close);
  const total = lead.length + middle.length + connector.length + close.length;
  const at = {
    middle: lead.length,
    connector: lead.length + middle.length,
    close: lead.length + middle.length + connector.length,
  };

  return (
    <h1 id="hero-title" className="mt-5">
      <span className="block max-w-[14ch] text-[length:var(--text-hero-1)] leading-[0.98] tracking-[-0.03em] sm:max-w-none">
        <RollingHeadline words={lead} total={total} />
      </span>{' '}
      <span className="mt-4 block max-w-[40ch] font-sans text-[length:var(--text-hero-2)] font-normal leading-[1.35] tracking-normal text-fg md:mt-5">
        <RollingHeadline words={middle} offset={at.middle} total={total} />
      </span>{' '}
      <span className="mt-6 block text-[length:var(--text-hero-3)] leading-[1.25] md:mt-8">
        <span className="mr-2 font-sans text-[length:var(--text-hero-2)] font-normal tracking-normal text-muted">
          <RollingHeadline words={connector} offset={at.connector} total={total} />
        </span>{' '}
        <span className="box-decoration-clone bg-signal px-[0.3em] py-[0.04em] text-signal-fg">
          <RollingHeadline words={close} offset={at.close} total={total} />
        </span>
      </span>
    </h1>
  );
}
