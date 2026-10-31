'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

/** The three ways the mark rolls. One is picked at random each time. */
const ROLLS: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = [
  {
    // Slides up out of its mask and comes back in from below, like a slot-machine reel.
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-115%)', offset: 0.42 },
      { transform: 'translateY(115%)', offset: 0.43 },
      { transform: 'translateY(0)' },
    ],
    options: { duration: 900, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  },
  {
    // The same reel, twice in a row, a little faster.
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-115%)', offset: 0.42 },
      { transform: 'translateY(115%)', offset: 0.43 },
      { transform: 'translateY(0)' },
    ],
    options: { duration: 620, iterations: 2, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  },
  {
    // Turns over once like a coin.
    keyframes: [
      { transform: 'perspective(500px) rotateX(0deg)' },
      { transform: 'perspective(500px) rotateX(360deg)' },
    ],
    options: { duration: 1000, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  },
];

/**
 * The ">" that leads into the closing phrase. It is drawn by CSS (see .chev in globals.css), so the
 * sentence's own dash stays in the text for screen readers and copying. It rises in with the rest
 * of the headline, then now and then, at random moments and in a random way, it rolls again.
 * No rolling under reduced motion or while the tab is hidden.
 */
export function ChevronMark({
  text,
  delay,
  duration,
}: {
  /** The sentence's own connector character, kept for assistive technology. */
  text: string;
  /** Milliseconds before the entrance starts, and how long it takes. */
  delay: number;
  duration: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    const schedule = (first: boolean) => {
      // The first roll waits for the entrance to be over; after that, 2 to 7 seconds apart.
      const wait = (first ? 3000 : 0) + 2000 + Math.random() * 5000;
      timer = window.setTimeout(() => {
        if (!document.hidden) {
          const roll = ROLLS[Math.floor(Math.random() * ROLLS.length)];
          el.animate(roll.keyframes, roll.options);
        }
        schedule(false);
      }, wait);
    };
    schedule(true);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span className="roll-mask">
      <span
        className="roll-word"
        style={{ '--roll-delay': `${delay}ms`, '--roll-dur': `${duration}ms` } as CSSProperties}
      >
        <span ref={ref} data-chevron="" className="chev">
          <span className="sr-only">{text}</span>
        </span>
      </span>
    </span>
  );
}
