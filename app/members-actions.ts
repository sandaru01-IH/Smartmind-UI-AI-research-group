'use server';

import { headers } from 'next/headers';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { SITE_URL } from '@/content/brand';
import { t } from '@/content/strings';
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

async function clientKey(): Promise<{ ip: string; origin: string }> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  // Supabase only honours redirect addresses on its allow-list, so a forged origin cannot hijack the link.
  const origin = h.get('origin') || SITE_URL;
  return { ip, origin: origin.replace(/\/$/, '') };
}

const wait = (seconds: number) =>
  `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`;

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

  const { ip, origin } = await clientKey();
  const state = registerThrottle.check(ip);
  if (state.locked) return { error: wait(state.retryAfterSeconds) };
  registerThrottle.fail(ip); // Every attempt counts, successful or not.

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: { display_name: parsed.data.displayName },
    },
  });
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

  const { ip } = await clientKey();
  const key = `${ip}|${parsed.data.email}`;
  const state = [
    memberLoginThrottle.check(key),
    memberAccountThrottle.check(parsed.data.email),
  ].find((s) => s.locked);
  if (state) return { error: wait(state.retryAfterSeconds) };

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    memberLoginThrottle.fail(key);
    memberAccountThrottle.fail(parsed.data.email);
    // Supabase only reports an unconfirmed email once the password was right, so this reveals nothing.
    if (/not confirmed/i.test(error.message)) return { error: t.members.notConfirmed };
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

  const { ip, origin } = await clientKey();
  const state = resetThrottle.check(ip);
  if (state.locked) return { error: wait(state.retryAfterSeconds) };
  resetThrottle.fail(ip);

  const supabase = await createSessionClient();
  if (!supabase) return { error: t.members.unavailable };
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm`,
  });
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
