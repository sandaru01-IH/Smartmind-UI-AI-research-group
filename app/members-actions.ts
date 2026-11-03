'use server';

import { headers } from 'next/headers';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { SITE_URL } from '@/content/brand';
import { t } from '@/content/strings';
import { classifyAuthError } from '@/lib/auth/auth-errors';
import { clientIpFrom } from '@/lib/auth/client-ip';
import {
  memberAccountThrottle,
  memberLoginThrottle,
  passwordChangeThrottle,
  registerThrottle,
  resendEmailThrottle,
  resendThrottle,
  resetThrottle,
} from '@/lib/auth/throttle';
import {
  forgotPasswordSchema,
  memberLoginSchema,
  registerSchema,
  resendConfirmationSchema,
  resetPasswordSchema,
  safeMemberNext,
} from '@/lib/members/schema';
import { recentRecoveryUser } from '@/lib/members/recovery';
import { getMember } from '@/lib/members/session';
import { MEDIA_BUCKET } from '@/lib/supabase/env';
import { createSessionClient } from '@/lib/supabase/server-client';

export interface MemberFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** The form finished and the page should show its "done" message. */
  done?: boolean;
  /** The reset session is missing or too old, so the form offers a new link. */
  expired?: boolean;
  /** The email is not confirmed yet, so the form offers to send the link again. */
  unconfirmed?: boolean;
  /**
   * What the person typed, so the form can put it back: React clears a form's fields once its
   * action settles, even on an error. Never holds a password.
   */
  values?: Record<string, string>;
}

const text = (v: FormDataEntryValue | null): string => (typeof v === 'string' ? v : '');

/** The caller's address, or null when no trustworthy one is present. */
async function clientIp(): Promise<string | null> {
  return clientIpFrom(await headers());
}

const tooMany = (seconds: number) => t.members.tooManyAttempts(Math.ceil(seconds / 60));

/** Supabase limits and outages, logged without anything that identifies the person. */
function logAuthTrouble(action: string, e: { status?: number; code?: string }): void {
  console.error('[auth]', { action, status: e.status, code: e.code });
}

/** A Supabase call that threw. Only the error's name is logged: its message can hold the address. */
function logAuthThrow(action: string, e: unknown): void {
  console.error('[auth]', { action, name: e instanceof Error ? e.name : typeof e });
}

/**
 * Creates an account and sends the confirmation email. Never says whether the email is already taken.
 * Every "done" carries the address back, so the panel can name where the link went.
 */
export async function registerAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const values: Record<string, string> = {
    displayName: text(formData.get('displayName')),
    email: text(formData.get('email')),
    ...(formData.get('acceptTerms') === 'on' ? { acceptTerms: 'on' } : {}),
  };
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
    acceptTerms: formData.get('acceptTerms') === 'on',
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { error: t.members.fixFields, fieldErrors, values };
  }

  const key = (await clientIp()) ?? parsed.data.email;
  const state = registerThrottle.check(key);
  if (state.locked) return { error: tooMany(state.retryAfterSeconds), values };
  registerThrottle.fail(key); // Every attempt counts, successful or not.

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable, values };
  let error;
  try {
    ({ error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${SITE_URL}/auth/confirm`,
        data: { display_name: parsed.data.displayName },
      },
    }));
  } catch (e) {
    logAuthThrow('register', e);
    return { error: t.members.unavailable, values };
  }
  const failure = classifyAuthError(error);
  const done = { done: true, values: { email: parsed.data.email } };
  if (error && failure === 'email_rate_limited') {
    // Only an existing address hits the per-address email limit, so it must look like success.
    logAuthTrouble('register', error);
    return done;
  }
  if (error && (failure === 'rate_limited' || failure === 'send_failed')) {
    // Told truthfully: the request limit is shared by everyone, and a failed send means no email.
    logAuthTrouble('register', error);
    return {
      error: failure === 'rate_limited' ? t.members.tryLater : t.members.mailFailed,
      values,
    };
  }
  if (failure === 'weak_password') {
    return {
      error: t.members.fixFields,
      fieldErrors: { password: [t.members.weakPassword] },
      values,
    };
  }
  if (error && !/already|registered/i.test(error.message)) {
    return { error: t.members.registerFailed, values };
  }
  return done;
}

export async function memberLoginAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const values = { email: text(formData.get('email')) };
  const parsed = memberLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: t.members.loginFailed, values };

  const ip = await clientIp();
  const key = ip ? `${ip}|${parsed.data.email}` : parsed.data.email;
  const state = [
    memberLoginThrottle.check(key),
    memberAccountThrottle.check(parsed.data.email),
  ].find((s) => s.locked);
  if (state) return { error: tooMany(state.retryAfterSeconds), values };

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable, values };
  let error;
  try {
    ({ error } = await supabase.auth.signInWithPassword(parsed.data));
  } catch (e) {
    logAuthThrow('memberLogin', e);
    return { error: t.members.unavailable, values };
  }
  if (error) {
    const failure = classifyAuthError(error);
    // Supabase's own limit or outage is not a wrong password, so it does not count against them.
    if (failure === 'send_failed') {
      logAuthTrouble('memberLogin', error);
      return { error: t.members.unavailable, values };
    }
    if (failure === 'rate_limited' || failure === 'email_rate_limited') {
      logAuthTrouble('memberLogin', error);
      return { error: t.members.tryLater, values };
    }
    memberLoginThrottle.fail(key);
    memberAccountThrottle.fail(parsed.data.email);
    // Supabase only reports an unconfirmed email once the password was right, so this reveals nothing.
    if (failure === 'not_confirmed')
      return { error: t.members.notConfirmed, unconfirmed: true, values };
    return { error: t.members.loginFailed, values };
  }
  memberLoginThrottle.reset(key);
  memberAccountThrottle.reset(parsed.data.email);
  redirect(safeMemberNext(String(formData.get('next') ?? '')));
}

/** Signs out this browser only; the member's other devices stay signed in. */
export async function memberLogoutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut({ scope: 'local' });
  redirect('/');
}

/** Sends a reset link. Always answers the same, so it cannot be used to find out who has an account. */
export async function forgotPasswordAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const values = { email: text(formData.get('email')) };
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: t.members.emailInvalid, values };

  const key = (await clientIp()) ?? parsed.data.email;
  const state = resetThrottle.check(key);
  if (state.locked) return { error: tooMany(state.retryAfterSeconds), values };
  resetThrottle.fail(key);

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable, values };
  let error;
  try {
    ({ error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${SITE_URL}/auth/confirm`,
    }));
  } catch (e) {
    logAuthThrow('forgotPassword', e);
    return { error: t.members.unavailable, values };
  }
  const failure = classifyAuthError(error);
  if (
    error &&
    failure === 'send_failed' &&
    (error.status === 0 || error.name === 'AuthRetryableFetchError')
  ) {
    // Supabase could not be reached at all, for every address alike: nothing was sent.
    logAuthTrouble('forgotPassword', error);
    return { error: t.members.unavailable, values };
  }
  if (error && (failure === 'email_rate_limited' || failure === 'send_failed')) {
    // Supabase only waits or sends mail for a real account, so both must look like a sent email.
    logAuthTrouble('forgotPassword', error);
    return { done: true };
  }
  // The per-request limit applies to everyone, so it reveals nothing about the account.
  if (error && failure === 'rate_limited') {
    logAuthTrouble('forgotPassword', error);
    return { error: t.members.tryLater, values };
  }
  return { done: true };
}

/**
 * Sends the sign-up confirmation email again. Like the reset form it always answers the same, so it
 * cannot tell anyone whether an address has an account or is already confirmed. Every attempt is
 * counted per client address and per email before Supabase is asked.
 */
export async function resendConfirmationAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const values = { email: text(formData.get('email')) };
  const parsed = resendConfirmationSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: t.members.emailInvalid, values };

  const key = (await clientIp()) ?? parsed.data.email;
  const state = [resendThrottle.check(key), resendEmailThrottle.check(parsed.data.email)].find(
    (s) => s.locked,
  );
  if (state) return { error: tooMany(state.retryAfterSeconds), values };
  resendThrottle.fail(key);
  resendEmailThrottle.fail(parsed.data.email);

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable, values };
  let error;
  try {
    // No redirect: the email templates build their links from the Site URL.
    ({ error } = await supabase.auth.resend({ type: 'signup', email: parsed.data.email }));
  } catch (e) {
    logAuthThrow('resendConfirmation', e);
    return { error: t.members.unavailable, values };
  }
  if (error) {
    logAuthTrouble('resendConfirmation', error);
    // The per-request limit applies to everyone, so it reveals nothing about the account.
    if (classifyAuthError(error) === 'rate_limited') return { error: t.members.tryLater, values };
  }
  // Sent, an interval limit, a failed send, an unknown or confirmed address: all look alike.
  return { done: true };
}

/**
 * Sets a new password. Needs the short session a reset link just opened: any other signed-in
 * session (a shared laptop, a stolen cookie) must not change the password without the old one.
 * Every other device is signed out afterwards; this one stays signed in.
 */
export async function resetPasswordAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) {
    return { error: t.members.fixFields, fieldErrors: { password: [t.members.passwordShort] } };
  }
  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
  const userId = await recentRecoveryUser(supabase);
  if (!userId) return { error: t.members.resetExpired, expired: true };

  const state = passwordChangeThrottle.check(userId);
  if (state.locked) return { error: tooMany(state.retryAfterSeconds) };
  passwordChangeThrottle.fail(userId);

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    // Say what was wrong, so a person who picked a breached or reused password does not keep
    // guessing and use up the hour's attempts without knowing why.
    const failure = classifyAuthError(error);
    if (failure === 'weak_password') {
      return { error: t.members.fixFields, fieldErrors: { password: [t.members.weakPassword] } };
    }
    if (failure === 'same_password') {
      return { error: t.members.fixFields, fieldErrors: { password: [t.members.samePassword] } };
    }
    if (failure === 'rate_limited') return { error: t.members.tryLater };
    return { error: t.members.resetFailed };
  }
  // The notice must not tell them the other devices are out when they are not.
  let othersOut = false;
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
    if (signOutError) logAuthTrouble('resetPassword', signOutError);
    else othersOut = true;
  } catch (e) {
    logAuthThrow('resetPassword', e);
  }
  redirect(othersOut ? '/account?password=changed' : '/account?password=changed-only');
}

/**
 * Deletes the signed-in member's account for good. Their profile photo file goes too; their posts and
 * comments stay, shown as "Former member". Admin accounts cannot be deleted here: the database
 * refuses them, so the account goes first and the photo only once that worked.
 */
export async function deleteMyAccountAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  if (formData.get('confirm') !== 'DELETE') return { error: t.members.deleteTypePrompt };
  const member = await getMember();
  if (!member) return { error: t.blog.needLogin };
  const { error } = await member.supabase.rpc('delete_my_account');
  if (error) return { error: t.members.deleteFailed };
  // The token still names the deleted user until it expires, which is all the storage rule checks.
  if (member.profile.photoPath) {
    await member.supabase.storage.from(MEDIA_BUCKET).remove([member.profile.photoPath]);
  }
  // Their name on old posts and comments turns into "Former member" straight away.
  updateTag('blog');
  revalidatePath('/blog', 'layout');
  revalidatePath('/');
  await member.supabase.auth.signOut({ scope: 'local' });
  redirect('/');
}

const LINK_TYPES: readonly EmailOtpType[] = ['email', 'signup', 'recovery', 'magiclink', 'invite'];

/**
 * Trades the one-use token from an emailed link for a session. It runs only when the person presses
 * the button on /auth/confirm, never when the link is merely opened: mail scanners and link
 * checkers open links ahead of the reader, and doing the work on a plain visit would let them use
 * the token up. The token is checked at most twice: every check is a request from this server, and
 * Supabase limits those per address for all visitors together. Confirming an email sends the
 * person to log in once; a reset link goes on to the new-password form, and a reset link that fails
 * goes back to asking for a new one. A Supabase rate limit is reported as such, never as an expired
 * link.
 */
export async function confirmLinkAction(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get('token_hash') ?? '');
  const type = String(formData.get('type') ?? '') as EmailOtpType;
  const code = String(formData.get('code') ?? '');
  const recovery = type === 'recovery';
  const supabase = await createSessionClient();
  if (!supabase) redirect('/login?error=confirm');

  const busy = recovery ? '/forgot-password?error=busy' : '/login?error=busy';
  const failed = recovery ? '/forgot-password?error=expired' : '/login?error=confirm';

  if (tokenHash) {
    if (!LINK_TYPES.includes(type)) redirect('/login?error=confirm');
    // A template can name the wrong type, and an email check would spend a reset token; a recovery
    // check refuses any other token without spending it, so it goes first.
    let kind: EmailOtpType = 'recovery';
    let { error } = await supabase.auth.verifyOtp({ type: kind, token_hash: tokenHash });
    if (error && !recovery && classifyAuthError(error) !== 'rate_limited') {
      kind = type;
      ({ error } = await supabase.auth.verifyOtp({ type: kind, token_hash: tokenHash }));
    }
    if (error) {
      if (classifyAuthError(error) === 'rate_limited') {
        logAuthTrouble('confirmLink', error);
        redirect(busy);
      }
      // A double click's second use fails. A recovery session opened moments ago is taken as the
      // first one, whatever type the link names; a plain login is not.
      if (await recentRecoveryUser(supabase)) redirect('/reset-password');
      redirect(failed);
    }
    if (kind === 'recovery') redirect('/reset-password');
    // Make them log in once so the browser holds a fresh session.
    await supabase.auth.signOut({ scope: 'local' });
    redirect('/login?verified=1');
  }
  if (code) {
    // Older email templates send ?code=, which does not say what kind of link it was.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      if (classifyAuthError(error) === 'rate_limited') {
        logAuthTrouble('confirmLink', error);
        redirect(busy);
      }
      redirect(failed);
    }
    redirect('/reset-password');
  }
  redirect('/login?error=confirm');
}
