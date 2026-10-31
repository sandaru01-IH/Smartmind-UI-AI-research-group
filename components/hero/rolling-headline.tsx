import type { CSSProperties } from 'react';

/**
 * Headline that rolls out word by word. Pure CSS (see .roll-word in globals.css): each word rises
 * out of its own mask. A piece of a longer headline sets its own start time (`base`), the gap
 * between its words (`step`) and how long each rise takes (`duration`), so the pieces can be timed
 * as one sequence. Under reduced motion the words simply sit in place.
 */
export function RollingHeadline({
  words,
  base = 150,
  step = Math.min(110, Math.round(1400 / Math.max(words.length, 1))),
  duration = 900,
}: {
  words: string[];
  /** Milliseconds before the first word starts rising. */
  base?: number;
  /** Milliseconds between one word starting and the next. */
  step?: number;
  /** Milliseconds each word takes to rise. */
  duration?: number;
}) {
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="roll-mask">
            <span
              className="roll-word"
              style={
                {
                  '--roll-delay': `${base + i * step}ms`,
                  '--roll-dur': `${duration}ms`,
                } as CSSProperties
              }
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
