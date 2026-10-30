'use client';

import { useState, useTransition } from 'react';
import { setHomeSectionAction } from '@/app/admin/home-actions';
import {
  HOME_SECTION_IDS,
  HOME_SECTION_LABELS,
  type HomeSectionId,
  type HomeSections,
} from '@/lib/home/section-ids';
import { Check } from './form-bits';
import { useToast } from './toast';

/** One switch per optional home section. A switch saves as soon as it is flipped. */
export function HomeSectionsForm({ initial }: { initial: HomeSections }) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();
  const toast = useToast();

  const flip = (id: HomeSectionId, enabled: boolean) => {
    setState((s) => ({ ...s, [id]: enabled }));
    start(async () => {
      const r = await setHomeSectionAction(id, enabled);
      if (r.ok) {
        toast.push(`${HOME_SECTION_LABELS[id].title} is now ${enabled ? 'on' : 'off'}.`);
      } else {
        setState((s) => ({ ...s, [id]: !enabled }));
        toast.push(r.message, 'error');
      }
    });
  };

  return (
    <ul className="max-w-[62ch] divide-y divide-line border border-line-strong">
      {HOME_SECTION_IDS.map((id) => (
        <li key={id} className="p-4">
          <Check
            checked={state[id]}
            onChange={(v) => flip(id, v)}
            hint={HOME_SECTION_LABELS[id].blurb}
          >
            {HOME_SECTION_LABELS[id].title}
          </Check>
        </li>
      ))}
      <li className="sr-only" aria-live="polite">
        {pending ? 'Saving' : ''}
      </li>
    </ul>
  );
}
