'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ExternalLink } from '@/components/ui/external-link';
import { TbcFlag } from '@/components/ui/tag';
import type { Milestone } from '@/content/chatbots';

/**
 * Vertical timeline with a sticky year and progress rail. Native scrolling only: the rail
 * reads scroll position, it never moves the page.
 */
export function JourneyTimeline({ milestones }: { milestones: Milestone[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = list.getBoundingClientRect();
      const anchor = window.innerHeight * 0.4;
      const p = (anchor - rect.top) / rect.height;
      setProgress(Math.min(1, Math.max(0, p)));
      let idx = 0;
      itemRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= anchor) idx = i;
      });
      setActive(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const current = milestones[active];

  return (
    <div className="grid-12 gap-y-6">
      {/* Sticky year and rail. A compact bar on small screens, a tall column from md up. */}
      <div className="sticky top-[var(--header-h)] z-10 col-span-12 -mx-[var(--gutter)] border-b border-line bg-bg/95 px-[var(--gutter)] py-3 backdrop-blur-sm md:static md:col-span-3 md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="md:sticky md:top-[calc(var(--header-h)+2rem)]">
          <p className="label-mono text-muted">
            <span className="sr-only">Current milestone year: </span>
            {String(active + 1).padStart(2, '0')} / {String(milestones.length).padStart(2, '0')}
          </p>
          <p aria-hidden="true" className="numeral mt-1 text-6xl text-fg md:text-7xl lg:text-8xl">
            {current?.year}
          </p>
          <div aria-hidden="true" className="relative mt-4 h-1 w-full bg-line md:h-56 md:w-1">
            <div
              className="absolute inset-0 origin-left scale-x-[var(--p)] bg-signal md:origin-top md:scale-x-100 md:scale-y-[var(--p)]"
              style={{ '--p': progress } as CSSProperties}
            />
          </div>
        </div>
      </div>

      <ol ref={listRef} className="col-span-12 md:col-span-9">
        {milestones.map((m, i) => (
          <li
            key={m.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            aria-current={i === active ? 'step' : undefined}
            className={`relative border-t py-10 transition-colors duration-300 md:py-14 ${
              i === active ? 'border-t-signal' : 'border-t-line'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <p className="label-mono text-fg">{m.when}</p>
              {m.confirmation === 'tbc' ? <TbcFlag /> : null}
            </div>
            <h3 className="mt-4 max-w-[26ch] text-2xl md:text-3xl">{m.title}</h3>
            <p className="mt-4 max-w-[62ch] text-muted">{m.detail}</p>
            {m.links?.length ? (
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-1">
                {m.links.map((l) => (
                  <li key={l.href}>
                    <ExternalLink
                      href={l.href}
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                    >
                      {l.label}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
