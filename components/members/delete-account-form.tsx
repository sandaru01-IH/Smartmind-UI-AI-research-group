'use client';

import { useActionState, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { deleteMyAccountAction, type MemberFormState } from '@/app/members-actions';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { FormMessage, Label, fieldClass } from './auth-fields';

/** Deleting an account is permanent, so it asks for the word DELETE first. */
export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    deleteMyAccountAction,
    {},
  );
  const [typed, setTyped] = useState('');
  return (
    <form action={action} className="max-w-md space-y-5" noValidate>
      <p className="text-muted">{t.members.deleteWarning}</p>
      <div>
        <Label htmlFor="confirm">{t.members.deleteTypePrompt}</Label>
        <input
          id="confirm"
          name="confirm"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={fieldClass}
        />
      </div>
      <FormMessage error={state.error} />
      <button
        type="submit"
        disabled={pending || typed !== 'DELETE'}
        className={buttonClass('secondary')}
      >
        {pending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
        {t.members.deleteSubmit}
      </button>
    </form>
  );
}
