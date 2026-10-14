'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { NUMBERS, type NumberStat } from '@/content/numbers';

const DURATION = 400;

function useCountUp(target: number, start: boolean): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!start) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setValue(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start]);
  return value;
}

function Stat({ stat, index }: { stat: NumberStat; index: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const noteId = useId();
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(false);
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
    <li ref={ref} className="group relative border-t border-line first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <button
        type="button"
        aria-describedby={noteId}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="flex h-full min-h-44 w-full flex-col justify-between p-5 text-left transition-colors hover:bg-surface-2 md:p-6"
      >
        <span className="label-mono text-muted">{String(index + 1).padStart(2, '0')}</span>
        <span>
          <span className="numeral block text-6xl md:text-7xl" aria-label={String(stat.value)}>
            <span aria-hidden="true">{value}</span>
          </span>
          <span className="mt-3 block text-[0.95rem] text-muted">{stat.label}</span>
        </span>
      </button>
      <p
        id={noteId}
        role="note"
        data-open={open}
        className="label-mono pointer-events-none absolute inset-x-0 bottom-full z-10 mb-1 translate-y-1 border border-line-strong bg-surface p-3 normal-case leading-snug tracking-normal text-fg opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 data-[open=true]:translate-y-0 data-[open=true]:opacity-100"
      >
        {stat.source}
      </p>
    </li>
  );
}

/** Animated counters. Every figure is computed from sourced content and shows its source on hover or focus. */
export function NumbersStrip() {
  return (
    <ul className="grid border border-line sm:grid-cols-2 lg:grid-cols-5">
      {NUMBERS.map((stat, i) => (
        <Stat key={stat.id} stat={stat} index={i} />
      ))}
    </ul>
  );
}
