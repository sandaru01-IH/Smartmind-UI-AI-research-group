import type { CSSProperties } from 'react';

/**
 * Headline that rolls out word by word. Pure CSS (see .roll-word in globals.css): each word rises
 * out of its own mask, staggered.
 * Under reduced motion the words simply sit in place.
 */
export function RollingHeadline({
  words,
  offset = 0,
  total = words.length,
}: {
  words: string[];
  /** Position of the first word in the whole headline, when it is shown in several pieces. */
  offset?: number;
  /** Word count of the whole headline, so every piece uses the same pace. */
  total?: number;
}) {
  // Long headlines step faster so the last word still arrives in about a second and a half.
  const step = Math.min(110, Math.round(1400 / total));
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="roll-mask">
            <span
              className="roll-word"
              style={{ '--roll-i': offset + i, '--roll-step': `${step}ms` } as CSSProperties}
            >
              {word}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}
