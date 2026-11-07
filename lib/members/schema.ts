import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email());
const newPassword = z.string().min(12, 'Use at least 12 characters').max(256);

export const registerSchema = z.object({
  email,
  password: newPassword,
  displayName: z.string().trim().min(2, 'Use at least 2 characters').max(80),
  acceptTerms: z.literal(true, { error: 'Accept the terms to register' }),
});
export type RegisterInput = z.output<typeof registerSchema>;

export const memberLoginSchema = z.object({
  email,
  password: z.string().min(1).max(256),
});

export const forgotPasswordSchema = z.object({ email });

export const resendConfirmationSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });

/** Where to go after logging in: an on-site path, never another site and never the admin. */
export function safeMemberNext(value: string | null | undefined): string {
  const fallback = '/';
  if (!value || value.length > 300) return fallback;
  // Browsers drop tab/newline/CR while parsing a URL, so '/\t/host' would become '//host'.
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.includes('\\') || value.includes('..')) return fallback;
  if (value === '/admin' || value.startsWith('/admin/') || value.startsWith('/admin?'))
    return fallback;
  // Parse it the way a browser would: it must stay on this origin and come back unchanged.
  const url = new URL(value, 'http://x');
  if (url.origin !== 'http://x' || url.pathname + url.search + url.hash !== value) return fallback;
  return value;
}
