import type { CSSProperties } from 'react';

/**
 * Headline that rolls out word by word. Pure CSS (see .roll-word in globals.css): each word rises
 * out of its own mask, staggered.
 * Under reduced motion the words simply sit in place.
 */
export function RollingHeadline({ words }: { words: string[] }) {
  // Long headlines step faster so the last word still arrives in about a second and a half.
  const step = Math.min(110, Math.round(1400 / words.length));
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="roll-mask">
            <span
              className="roll-word"
              style={{ '--roll-i': i, '--roll-step': `${step}ms` } as CSSProperties}
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
