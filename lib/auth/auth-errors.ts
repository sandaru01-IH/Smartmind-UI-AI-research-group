export type AuthFailure =
  | 'rate_limited'
  | 'send_failed'
  | 'weak_password'
  | 'same_password'
  | 'not_confirmed'
  | 'bad_credentials'
  | 'other';

/**
 * Sorts a Supabase Auth error into what the person should be told. Rate limits and outages are
 * Supabase's problem, not a wrong password, so they must never be shown or counted as one.
 */
export function classifyAuthError(
  e: { status?: number; code?: string; message?: string } | null,
): AuthFailure {
  if (!e) return 'other';
  const { status, code, message = '' } = e;
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429)
    return 'rate_limited';
  if (
    (status !== undefined && status >= 500) ||
    code === 'unexpected_failure' ||
    code === 'email_address_not_authorized' ||
    /sending .* email/i.test(message)
  )
    return 'send_failed';
  if (code === 'weak_password') return 'weak_password';
  if (code === 'same_password') return 'same_password';
  if (code === 'email_not_confirmed') return 'not_confirmed';
  if (code === 'invalid_credentials') return 'bad_credentials';
  return 'other';
}
