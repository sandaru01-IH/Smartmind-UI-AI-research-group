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
  registerThrottle,
  resetThrottle,
} from '@/lib/auth/throttle';
import {
  forgotPasswordSchema,
  memberLoginSchema,
  registerSchema,
  resetPasswordSchema,
  safeMemberNext,
} from '@/lib/members/schema';
import { getMember } from '@/lib/members/session';
import { MEDIA_BUCKET } from '@/lib/supabase/env';
import { createSessionClient } from '@/lib/supabase/server-client';

export interface MemberFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** The form finished and the page should show its "done" message. */
  done?: boolean;
}

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

/** Creates an account and sends the confirmation email. Never says whether the email is already taken. */
export async function registerAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
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
    return { error: t.members.fixFields, fieldErrors };
  }

  const key = (await clientIp()) ?? parsed.data.email;
  const state = registerThrottle.check(key);
  if (state.locked) return { error: tooMany(state.retryAfterSeconds) };
  registerThrottle.fail(key); // Every attempt counts, successful or not.

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
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
    return { error: t.members.unavailable };
  }
  const failure = classifyAuthError(error);
  if (error && failure === 'email_rate_limited') {
    // Only an existing address hits the per-address email limit, so it must look like success.
    logAuthTrouble('register', error);
    return { done: true };
  }
  if (error && (failure === 'rate_limited' || failure === 'send_failed')) {
    // Told truthfully: the request limit is shared by everyone, and a failed send means no email.
    logAuthTrouble('register', error);
    return { error: failure === 'rate_limited' ? t.members.tryLater : t.members.mailFailed };
  }
  if (failure === 'weak_password') {
    return { error: t.members.fixFields, fieldErrors: { password: [t.members.weakPassword] } };
  }
  if (error && !/already|registered/i.test(error.message)) {
    return { error: t.members.registerFailed };
  }
  return { done: true };
}

export async function memberLoginAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const parsed = memberLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: t.members.loginFailed };

  const ip = await clientIp();
  const key = ip ? `${ip}|${parsed.data.email}` : parsed.data.email;
  const state = [
    memberLoginThrottle.check(key),
    memberAccountThrottle.check(parsed.data.email),
  ].find((s) => s.locked);
  if (state) return { error: tooMany(state.retryAfterSeconds) };

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
  let error;
  try {
    ({ error } = await supabase.auth.signInWithPassword(parsed.data));
  } catch (e) {
    logAuthThrow('memberLogin', e);
    return { error: t.members.unavailable };
  }
  if (error) {
    const failure = classifyAuthError(error);
    // Supabase's own limit or outage is not a wrong password, so it does not count against them.
    if (failure === 'send_failed') {
      logAuthTrouble('memberLogin', error);
      return { error: t.members.unavailable };
    }
    if (failure === 'rate_limited' || failure === 'email_rate_limited') {
      logAuthTrouble('memberLogin', error);
      return { error: t.members.tryLater };
    }
    memberLoginThrottle.fail(key);
    memberAccountThrottle.fail(parsed.data.email);
    // Supabase only reports an unconfirmed email once the password was right, so this reveals nothing.
    if (failure === 'not_confirmed') return { error: t.members.notConfirmed };
    return { error: t.members.loginFailed };
  }
  memberLoginThrottle.reset(key);
  memberAccountThrottle.reset(parsed.data.email);
  redirect(safeMemberNext(String(formData.get('next') ?? '')));
}

export async function memberLogoutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect('/');
}

/** Sends a reset link. Always answers the same, so it cannot be used to find out who has an account. */
export async function forgotPasswordAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: t.members.emailInvalid };

  const key = (await clientIp()) ?? parsed.data.email;
  const state = resetThrottle.check(key);
  if (state.locked) return { error: tooMany(state.retryAfterSeconds) };
  resetThrottle.fail(key);

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
  let error;
  try {
    ({ error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${SITE_URL}/auth/confirm`,
    }));
  } catch (e) {
    logAuthThrow('forgotPassword', e);
    return { error: t.members.unavailable };
  }
  const failure = classifyAuthError(error);
  if (error && (failure === 'email_rate_limited' || failure === 'send_failed')) {
    // Supabase only limits or sends mail for a real account, so both must look like a sent email.
    logAuthTrouble('forgotPassword', error);
    return { done: true };
  }
  // The per-request limit applies to everyone, so it reveals nothing about the account.
  if (error && failure === 'rate_limited') {
    logAuthTrouble('forgotPassword', error);
    return { error: t.members.tryLater };
  }
  return { done: true };
}

/** Sets a new password. Needs the short session the reset link just opened. */
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
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: t.members.resetExpired };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: t.members.resetFailed };
  return { done: true };
}

/**
 * Deletes the signed-in member's account for good. Their profile photo file goes too; their posts and
 * comments stay, shown as "Former member". Admin accounts cannot be deleted here.
 */
export async function deleteMyAccountAction(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  if (formData.get('confirm') !== 'DELETE') return { error: t.members.deleteTypePrompt };
  const member = await getMember();
  if (!member) return { error: t.blog.needLogin };
  if (member.profile.photoPath) {
    await member.supabase.storage.from(MEDIA_BUCKET).remove([member.profile.photoPath]);
  }
  const { error } = await member.supabase.rpc('delete_my_account');
  if (error) return { error: t.members.deleteFailed };
  // Their name on old posts and comments turns into "Former member" straight away.
  updateTag('blog');
  revalidatePath('/blog', 'layout');
  revalidatePath('/');
  await member.supabase.auth.signOut({ scope: 'local' });
  redirect('/');
}

const LINK_TYPES: readonly EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'magiclink'];

/**
 * Checks the one-use token. A reset ("recovery") is tried first: Supabase refuses it for any token
 * that is not a reset token without using that token up, whereas a plain email check would accept a
 * reset token too and leave the person on the login page with no way to set a password. Then the
 * link's own `type` and the remaining kinds are tried, because a hand-edited email template can
 * easily name the wrong one. Returns the kind that matched, or null.
 */
async function verifyLinkToken(
  supabase: NonNullable<Awaited<ReturnType<typeof createSessionClient>>>,
  tokenHash: string,
  type: EmailOtpType,
): Promise<EmailOtpType | null> {
  const order = new Set<EmailOtpType>(['recovery', type, ...LINK_TYPES]);
  for (const kind of order) {
    const { error } = await supabase.auth.verifyOtp({ type: kind, token_hash: tokenHash });
    if (!error) return kind;
  }
  return null;
}

/**
 * Trades the one-use token from an emailed link for a session. It runs only when the person presses
 * the button on /auth/confirm, never when the link is merely opened: mail scanners and link
 * checkers open links ahead of the reader, and doing the work on a plain visit would let them use
 * the token up. Confirming an email sends the person to log in once; a reset link goes on to the
 * new-password form, and a reset link that fails goes back to asking for a new one.
 */
export async function confirmLinkAction(formData: FormData): Promise<void> {
  const tokenHash = String(formData.get('token_hash') ?? '');
  const type = String(formData.get('type') ?? '') as EmailOtpType;
  const code = String(formData.get('code') ?? '');
  const supabase = await createSessionClient();
  if (!supabase) redirect('/login?error=confirm');

  if (tokenHash && LINK_TYPES.includes(type)) {
    const kind = await verifyLinkToken(supabase, tokenHash, type);
    if (!kind)
      redirect(type === 'recovery' ? '/forgot-password?error=expired' : '/login?error=confirm');
    if (kind === 'recovery') redirect('/reset-password');
    // Make them log in once so the browser holds a fresh session.
    await supabase.auth.signOut();
    redirect('/login?verified=1');
  }
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) redirect('/forgot-password?error=expired');
    redirect('/reset-password');
  }
  redirect('/login?error=confirm');
}
