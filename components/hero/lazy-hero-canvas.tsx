'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const HeroCanvas = dynamic(() => import('./hero-canvas').then((m) => m.HeroCanvas), { ssr: false });

/**
 * Loads the simulation code only after the page has painted and the browser is idle, so the hero
 * text decides the largest contentful paint and the canvas never competes with it for bandwidth.
 */
export function LazyHeroCanvas() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = () => setReady(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(start, 400);
    return () => window.clearTimeout(id);
  }, []);
  return ready ? <HeroCanvas /> : null;
}
