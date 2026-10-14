'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const CommandPalette = dynamic(() => import('./command-palette').then((m) => m.CommandPalette), {
  ssr: false,
});

type Pages = { href: string; label: string }[];

/**
 * The palette code loads after the page is idle, or at once if someone presses Ctrl or Cmd + K or
 * clicks the search button first. The key press that triggered the load is replayed once it is ready.
 */
export function LazyCommandPalette({ pages }: { pages: Pages }) {
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const [openRequested, setOpenRequested] = useState(false);
  useEffect(() => {
    const load = () => {
      loaded.current = true;
      setReady(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (loaded.current) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        load();
        setOpenRequested(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (loaded.current) return;
      if ((e.target as Element | null)?.closest('[data-palette-open]')) {
        load();
        setOpenRequested(true);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(load, { timeout: 4000 })
        : window.setTimeout(load, 1500);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);
  return ready ? <CommandPalette pages={pages} openOnMount={openRequested} /> : null;
}
