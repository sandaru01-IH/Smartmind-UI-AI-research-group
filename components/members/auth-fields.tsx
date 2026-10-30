'use client';

import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { t } from '@/content/strings';

export const fieldClass =
  'h-12 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="label-mono mb-2 block text-muted">
      {children}
    </label>
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1 text-[0.9rem] text-danger">
      {messages[0]}
    </p>
  );
}

/** A password box with a show/hide button. */
export function PasswordField({
  id = 'password',
  name = 'password',
  autoComplete,
  hint,
  errors,
}: {
  id?: string;
  name?: string;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  errors?: string[];
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{t.members.password}</Label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === 'new-password' ? 12 : undefined}
          aria-describedby={errors?.length ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={errors?.length ? true : undefined}
          className={`${fieldClass} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t.members.hidePassword : t.members.showPassword}
          aria-pressed={show}
          className="absolute right-0 top-0 inline-flex h-12 w-12 items-center justify-center text-muted hover:text-fg"
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && !errors?.length ? (
        <p id={`${id}-hint`} className="mt-1 text-[0.9rem] text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} messages={errors} />
    </div>
  );
}

export function FormMessage({ error }: { error?: string }) {
  return (
    <div aria-live="assertive" className="min-h-6">
      {error ? (
        <p role="alert" className="text-[0.95rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
