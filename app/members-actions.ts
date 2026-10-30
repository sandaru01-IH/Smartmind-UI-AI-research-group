'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
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
