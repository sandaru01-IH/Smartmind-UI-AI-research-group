import type { CSSProperties } from 'react';

/**
 * Headline that rolls out word by word. Pure CSS (see .roll-word in globals.css): each word rises
 * out of its own mask, staggered.
 * Under reduced motion the words simply sit in place.
 */
export function RollingHeadline({ words }: { words: string[] }) {
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="roll-mask">
            <span className="roll-word" style={{ '--roll-i': i } as CSSProperties}>
              {word}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}
