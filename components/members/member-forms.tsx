'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  forgotPasswordAction,
  memberLoginAction,
  registerAction,
  resetPasswordAction,
  type MemberFormState,
} from '@/app/members-actions';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { FieldError, FormMessage, Label, PasswordField, fieldClass } from './auth-fields';

function Submit({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass('primary', 'w-full')}>
      {pending ? (
        <>
          <Loader2 size={16} aria-hidden="true" className="animate-spin" /> {busy}
        </>
      ) : (
        idle
      )}
    </button>
  );
}

function EmailField({ errors }: { errors?: string[] }) {
  return (
    <div>
      <Label htmlFor="email">{t.members.email}</Label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className={fieldClass}
      />
      <FieldError id="email-error" messages={errors} />
    </div>
  );
}

function Done({ title, message }: { title?: string; message: string }) {
  return (
    <div role="status" className="space-y-2 border border-line-strong p-4">
      {title ? <p className="font-display text-lg">{title}</p> : null}
      <p className="text-muted">{message}</p>
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(registerAction, {});
  if (state.done)
    return <Done title={t.members.registerDoneTitle} message={t.members.registerDone} />;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="displayName">{t.members.displayName}</Label>
        <input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          aria-describedby="displayName-hint"
          className={fieldClass}
        />
        <p id="displayName-hint" className="mt-1 text-[0.9rem] text-muted">
          {t.members.displayNameHint}
        </p>
        <FieldError id="displayName-error" messages={fe.displayName} />
      </div>
      <EmailField errors={fe.email} />
      <PasswordField
        autoComplete="new-password"
        hint={t.members.passwordHint}
        errors={fe.password}
      />
      <div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--signal)]"
          />
          <span>
            {t.members.acceptTermsBefore}{' '}
            <Link href="/terms" className="underline underline-offset-4">
              {t.members.terms}
            </Link>{' '}
            {t.members.and}{' '}
            <Link href="/privacy" className="underline underline-offset-4">
              {t.members.privacy}
            </Link>
          </span>
        </label>
        <FieldError id="acceptTerms-error" messages={fe.acceptTerms} />
      </div>
      <FormMessage error={state.error} />
      <Submit pending={pending} idle={t.members.registerSubmit} busy={t.members.registerBusy} />
    </form>
  );
}

export function MemberLoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(memberLoginAction, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {notice && !state.error ? (
        <p role="status" className="border border-line-strong p-3 text-[0.95rem] text-muted">
          {notice}
        </p>
      ) : null}
      <EmailField />
      <PasswordField autoComplete="current-password" />
      <p>
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center text-[0.95rem] text-muted underline underline-offset-4 hover:text-fg"
        >
          {t.members.forgot}
        </Link>
      </p>
      <FormMessage error={state.error} />
      <Submit pending={pending} idle={t.members.loginSubmit} busy={t.members.loginBusy} />
    </form>
  );
}

export function ForgotPasswordForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    forgotPasswordAction,
    {},
  );
  if (state.done) return <Done message={t.members.forgotDone} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      {notice && !state.error ? (
        <p role="status" className="border border-line-strong p-3 text-[0.95rem] text-muted">
          {notice}
        </p>
      ) : null}
      <EmailField />
      <FormMessage error={state.error} />
      <Submit pending={pending} idle={t.members.forgotSubmit} busy={t.members.loginBusy} />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    resetPasswordAction,
    {},
  );
  if (state.done) {
    return (
      <div className="space-y-4">
        <Done message={t.members.resetDone} />
        <Link href="/login" className={buttonClass('primary', 'w-full')}>
          {t.members.loginSubmit}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <PasswordField
        autoComplete="new-password"
        hint={t.members.passwordHint}
        errors={state.fieldErrors?.password}
      />
      <FormMessage error={state.error} />
      <Submit pending={pending} idle={t.members.resetSubmit} busy={t.members.loginBusy} />
    </form>
  );
}
