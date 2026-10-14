'use client';

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

/**
 * Reveals its children once when they enter the viewport. Elements are visible without JS
 * and under reduced motion (see globals.css). `index` staggers siblings by 40 ms each.
 */
export function Reveal({
  as: Tag = 'div',
  index = 0,
  className,
  children,
}: {
  as?: ElementType;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.dataset.in = 'true';
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.in = 'true';
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      style={{ '--i': Math.min(index, 12) } as CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}
