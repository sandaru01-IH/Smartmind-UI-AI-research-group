'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '@/app/admin/actions';
import { useToast } from './toast';

/**
 * A single switch that flips one flag through a server action and puts it back if the action fails.
 * `on` means the item is shown (or, for blocking, that the member is allowed).
 */
export function FlagSwitch({
  initial,
  label,
  onLabel,
  offLabel,
  save,
}: {
  initial: boolean;
  /** Accessible name for the switch, naming the item it controls. */
  label: string;
  onLabel: string;
  offLabel: string;
  save: (on: boolean) => Promise<ActionResult>;
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(async () => {
            const r = await save(next);
            if (r.ok) toast.push(next ? onLabel : offLabel);
            else {
              setOn(!next);
              toast.push(r.message, 'error');
            }
          });
        }}
        className="h-5 w-5 accent-[var(--signal)]"
      />
      <span className="text-[0.9rem] text-muted">{on ? onLabel : offLabel}</span>
    </label>
  );
}
