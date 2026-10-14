'use client';

import { useActionState, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginAction, type LoginState } from '@/app/admin/actions';
import { buttonClass } from '@/components/ui/button';

const field =
  'h-12 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {expired && !state.error ? (
        <p role="status" className="border border-line-strong p-3 text-[0.95rem] text-muted">
          Your session ended. Sign in again to continue.
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="label-mono mb-2 block text-muted">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={field} />
      </div>
      <div>
        <label htmlFor="password" className="label-mono mb-2 block text-muted">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={`${field} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            className="absolute right-0 top-0 inline-flex h-12 w-12 items-center justify-center text-muted hover:text-fg"
          >
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div aria-live="assertive" className="min-h-6">
        {state.error ? (
          <p role="alert" className="text-[0.95rem] text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className={buttonClass('primary', 'w-full')}>
        {pending ? (
          <>
            <Loader2 size={16} aria-hidden="true" className="animate-spin" /> Signing in
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
