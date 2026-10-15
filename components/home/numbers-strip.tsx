'use client';

import { useEffect, useRef, useState } from 'react';
import type { NumberStat } from '@/content/numbers';
import { usePrefersReducedMotion } from '@/lib/use-reduced-motion';

const DURATION = 400;

function useCountUp(target: number, start: boolean): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, reduced]);
  // Before the counter scrolls into view, and under reduced motion, show the final figure.
  return start && !reduced ? value : target;
}

function Stat({ stat, index }: { stat: NumberStat; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const [seen, setSeen] = useState(false);
  const value = useCountUp(stat.value, seen);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className="flex min-h-40 flex-col justify-between bg-bg p-5 sm:min-h-44 sm:last:col-span-2 md:p-6 lg:last:col-span-1"
    >
      <span className="label-mono text-muted">{String(index + 1).padStart(2, '0')}</span>
      <span>
        <span className="numeral block text-6xl md:text-7xl">
          <span className="sr-only">{stat.value}</span>
          <span aria-hidden="true">{value}</span>
        </span>
        <span className="mt-3 block text-[0.95rem] text-muted">{stat.label}</span>
      </span>
    </li>
  );
}

/** Animated counters. Plain figures with a label: no hover or focus pop-ups. */
export function NumbersStrip({ stats }: { stats: NumberStat[] }) {
  return (
    <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat, i) => (
        <Stat key={stat.id} stat={stat} index={i} />
      ))}
    </ul>
  );
}
