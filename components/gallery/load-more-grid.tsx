'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

const FIRST = 7; // one wide feature card plus two full rows
const STEP = 6; // two more rows each time

/**
 * The gallery grid, showing a first batch and a Load more button, so the partners below are one scroll
 * away instead of the end of a very long page. The cards are rendered by the server and passed in.
 */
export function LoadMoreGrid({ items }: { items: ReactNode[] }) {
  const [shown, setShown] = useState(FIRST);
  const left = items.length - shown;
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.slice(0, shown)}</div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {left > 0 ? (
          <button
            type="button"
            onClick={() => setShown((n) => n + STEP)}
            className={buttonClass('secondary')}
          >
            Load more
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        ) : null}
        <p role="status" className="label-mono text-muted">
          Showing {Math.min(shown, items.length)} of {items.length}
        </p>
      </div>
    </div>
  );
}
