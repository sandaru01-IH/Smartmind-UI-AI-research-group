import type { CSSProperties } from 'react';
import { IDENTITY, splitIdentityLine } from '@/content/philosophy';
import { RollingHeadline } from './rolling-headline';

const words = (text: string) => text.split(' ');

/**
 * The home headline: the identity sentence, word for word, set in three tiers so it reads as a
 * statement instead of a paragraph. The lead is two very large lines, the supporting clause is
 * quieter, and the closing phrase sits on a lime highlight. All of it stays one sentence inside
 * one h1.
 *
 * The entrance is one timed sequence (milliseconds): the lead rises slowly, the supporting clause
 * follows quickly, then the highlight wipes in from the left and its words rise inside it, so the
 * lime is never on screen before its text.
 */
const T = {
  lead: { base: 120, step: 150, duration: 1100 },
  middle: { base: 640, step: 30, duration: 750 },
  connector: { base: 1060, step: 50, duration: 700 },
  wipe: { delay: 1120, duration: 700 },
  close: { base: 1280, step: 70, duration: 800 },
} as const;

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

  const [leadFirst, ...leadRest] = words(parts.lead);

  return (
    <h1 id="hero-title" className="mt-5">
      <span className="block text-[length:var(--text-hero-1)] leading-[0.94] tracking-[-0.035em]">
        <span className="block">
          <RollingHeadline words={[leadFirst]} {...T.lead} />
        </span>{' '}
        <span className="block">
          <RollingHeadline
            words={leadRest}
            base={T.lead.base + T.lead.step}
            step={T.lead.step}
            duration={T.lead.duration}
          />
        </span>
      </span>{' '}
      <span className="mt-5 block max-w-[42ch] font-sans text-[length:var(--text-hero-2)] font-normal leading-[1.35] tracking-normal text-fg md:mt-7">
        <RollingHeadline words={words(parts.middle)} {...T.middle} />
      </span>{' '}
      <span className="mt-6 block text-[length:var(--text-hero-3)] leading-[1.3] md:mt-9">
        <span className="mr-2 font-sans text-[length:var(--text-hero-2)] font-normal tracking-normal text-muted">
          <RollingHeadline words={words(parts.connector)} {...T.connector} />
        </span>{' '}
        <span
          className="hl-wipe box-decoration-clone px-[0.3em] py-[0.04em] text-signal-fg"
          style={
            {
              '--hl-delay': `${T.wipe.delay}ms`,
              '--hl-dur': `${T.wipe.duration}ms`,
            } as CSSProperties
          }
        >
          <RollingHeadline words={words(parts.close)} {...T.close} />
        </span>
      </span>
    </h1>
  );
}
