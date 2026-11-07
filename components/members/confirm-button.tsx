'use client';

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

/**
 * The submit button of the /auth/confirm form. The link's token works once, so a second press must
 * not send it again: `disabled` only lands after a re-render, so a click that arrives in the same
 * moment is also stopped here.
 */
export function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const sent = useRef(false);
  useEffect(() => {
    if (!pending) sent.current = false;
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(e) => {
        if (sent.current) e.preventDefault();
        sent.current = true;
      }}
      className={buttonClass('primary', 'w-full')}
    >
      {pending ? (
        <>
          <Loader2 size={16} aria-hidden="true" className="animate-spin" /> {label}
        </>
      ) : (
        label
      )}
    </button>
  );
}
