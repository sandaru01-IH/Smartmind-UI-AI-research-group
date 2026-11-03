'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import {
  forgotPasswordAction,
  memberLoginAction,
  registerAction,
  resendConfirmationAction,
  resetPasswordAction,
  type MemberFormState,
} from '@/app/members-actions';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import {
  FieldError,
  FormMessage,
  Label,
  PasswordField,
  describedBy,
  fieldClass,
} from './auth-fields';

/**
 * After a failed submit, moves focus to the first invalid field, else to the form message. React
 * leaves focus on the button, so a keyboard or screen reader user would not learn what went wrong.
 * Keyed on the action state: every result is a new object, so a repeat of the same error refocuses.
 */
function useFocusOnError(state: MemberFormState, form: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (!state.error) return;
    const target =
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form.current?.querySelector<HTMLElement>('[data-form-message]');
    target?.focus();
  }, [state, form]);
}

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

function EmailField({
  errors,
  defaultValue,
  autoComplete = 'email',
  id = 'email',
}: {
  errors?: string[];
  defaultValue?: string;
  autoComplete?: 'email' | 'username';
  /** Set when a second form on the page has its own email field. */
  id?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{t.members.email}</Label>
      <input
        id={id}
        name="email"
        type="email"
        autoComplete={autoComplete}
        required
        defaultValue={defaultValue}
        aria-describedby={describedBy(!!errors?.length && `${id}-error`)}
        aria-invalid={errors?.length ? true : undefined}
        className={fieldClass}
      />
      <FieldError id={`${id}-error`} messages={errors} />
    </div>
  );
}

/** Anything after the message (a follow-up form, links) sits outside the live region. */
function Done({
  title,
  message,
  children,
}: {
  title?: string;
  message: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The form it replaces held focus, which would otherwise be lost with it.
  useEffect(() => ref.current?.focus(), []);
  const status = (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="space-y-2 border border-line-strong p-4 focus:outline-none"
    >
      {title ? <p className="font-display text-lg">{title}</p> : null}
      <p className="text-muted">{message}</p>
    </div>
  );
  return children ? (
    <div className="space-y-6">
      {status}
      {children}
    </div>
  ) : (
    status
  );
}

const textLink =
  'inline-flex min-h-11 items-center text-[0.95rem] underline underline-offset-4 hover:text-fg';

/**
 * Sends the confirmation email again. Always answers the same, whether or not the address has an
 * account. Pages show it where a missing or dead link leaves someone stuck.
 */
export function ResendForm({ email, lead }: { email?: string; lead?: string }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    resendConfirmationAction,
    {},
  );
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  if (state.done) return <Done message={t.members.resendDone} />;
  return (
    <form ref={form} action={action} className="space-y-4" noValidate>
      {lead ? <p className="text-[0.95rem] text-muted">{lead}</p> : null}
      <EmailField id="resend-email" defaultValue={state.values?.email ?? email} />
      <FormMessage error={state.error} />
      <Submit pending={pending} idle={t.members.resendSubmit} busy={t.members.resendBusy} />
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(registerAction, {});
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  if (state.done) {
    const email = state.values?.email ?? '';
    return (
      <Done title={t.members.registerDoneTitle} message={t.members.registerDone(email)}>
        <ResendForm email={email} lead={t.members.registerDoneResend} />
        <div className="space-y-1 border-t border-line pt-4 text-[0.95rem] text-muted">
          <p>{t.members.registerDoneHaveAccount}</p>
          <p className="flex flex-wrap gap-x-6">
            <Link href="/login" className={textLink}>
              {t.members.login}
            </Link>
            <Link href="/forgot-password" className={textLink}>
              {t.members.forgot}
            </Link>
          </p>
        </div>
      </Done>
    );
  }
  const fe = state.fieldErrors ?? {};
  return (
    <form ref={form} action={action} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="displayName">{t.members.displayName}</Label>
        <input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={state.values?.displayName}
          aria-describedby={describedBy(
            !!fe.displayName?.length && 'displayName-error',
            'displayName-hint',
          )}
          aria-invalid={fe.displayName?.length ? true : undefined}
          className={fieldClass}
        />
        <p id="displayName-hint" className="mt-1 text-[0.9rem] text-muted">
          {t.members.displayNameHint}
        </p>
        <FieldError id="displayName-error" messages={fe.displayName} />
      </div>
      <EmailField errors={fe.email} defaultValue={state.values?.email} />
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
            defaultChecked={state.values?.acceptTerms === 'on'}
            aria-describedby={describedBy(!!fe.acceptTerms?.length && 'acceptTerms-error')}
            aria-invalid={fe.acceptTerms?.length ? true : undefined}
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

/**
 * `resend` puts the "send the link again" form under the log-in form from the start (a dead confirm
 * link); otherwise it appears once a log-in fails because the email is not confirmed.
 */
export function MemberLoginForm({
  next,
  notice,
  resend = false,
}: {
  next: string;
  notice?: string;
  resend?: boolean;
}) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(memberLoginAction, {});
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  return (
    <>
      <form ref={form} action={action} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next} />
        {notice && !state.error ? (
          <p role="status" className="border border-line-strong p-3 text-[0.95rem] text-muted">
            {notice}
          </p>
        ) : null}
        <EmailField defaultValue={state.values?.email} autoComplete="username" />
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
      {resend || state.unconfirmed ? (
        // Keyed on the address so a later unconfirmed log-in refills the field.
        <ResendSection key={state.values?.email ?? ''} email={state.values?.email} />
      ) : null}
    </>
  );
}

function ResendSection({ email }: { email?: string }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <ResendForm email={email} lead={t.members.resendLead} />
    </section>
  );
}

export function ForgotPasswordForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    forgotPasswordAction,
    {},
  );
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  if (state.done) return <Done message={t.members.forgotDone} />;
  return (
    <form ref={form} action={action} className="space-y-5" noValidate>
      {notice && !state.error ? (
        <p role="status" className="border border-line-strong p-3 text-[0.95rem] text-muted">
          {notice}
        </p>
      ) : null}
      <EmailField defaultValue={state.values?.email} />
      <FormMessage error={state.error} />
      <Submit pending={pending} idle={t.members.forgotSubmit} busy={t.members.forgotBusy} />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(
    resetPasswordAction,
    {},
  );
  const form = useRef<HTMLFormElement>(null);
  useFocusOnError(state, form);
  return (
    <form ref={form} action={action} className="space-y-5" noValidate>
      <PasswordField
        autoComplete="new-password"
        hint={t.members.passwordHint}
        errors={state.fieldErrors?.password}
      />
      <FormMessage error={state.error} />
      {state.expired ? (
        <p>
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center text-[0.95rem] underline underline-offset-4"
          >
            {t.members.resetNewLink}
          </Link>
        </p>
      ) : null}
      <Submit pending={pending} idle={t.members.resetSubmit} busy={t.members.resetBusy} />
    </form>
  );
}
