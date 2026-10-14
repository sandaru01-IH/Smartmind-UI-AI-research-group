'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

const CommandPalette = dynamic(() => import('./command-palette').then((m) => m.CommandPalette), {
  ssr: false,
});

type Pages = { href: string; label: string }[];

/**
 * The palette code loads after the page is idle, or at once if someone presses Ctrl or Cmd + K or
 * clicks the search button first. Until the palette reports that it has mounted and is listening
 * for itself, this wrapper keeps catching those inputs and asks the palette to open on arrival.
 */
export function LazyCommandPalette({ pages }: { pages: Pages }) {
  const [ready, setReady] = useState(false);
  const [openRequested, setOpenRequested] = useState(false);
  const listening = useRef(false);
  const onMounted = useCallback(() => {
    listening.current = true;
  }, []);

  useEffect(() => {
    const request = () => {
      setReady(true);
      setOpenRequested(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (listening.current) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        request();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (listening.current) return;
      if ((e.target as Element | null)?.closest('[data-palette-open]')) request();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    const load = () => setReady(true);
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

  return ready ? (
    <CommandPalette pages={pages} openOnMount={openRequested} onMounted={onMounted} />
  ) : null;
}
