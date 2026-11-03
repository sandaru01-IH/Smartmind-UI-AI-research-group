export type AuthFailure =
  | 'rate_limited'
  | 'email_rate_limited'
  | 'send_failed'
  | 'weak_password'
  | 'same_password'
  | 'not_confirmed'
  | 'bad_credentials'
  | 'other';

/**
 * Sorts a Supabase Auth error into what the person should be told. Rate limits and outages are
 * Supabase's problem, not a wrong password, so they must never be shown or counted as one.
 * `email_rate_limited` is kept apart because GoTrue only hits the per-address wait ("you can only
 * request this after N seconds") for a real account. GoTrue uses the same error code for the
 * project-wide hourly mail cap, which says nothing about any account and means no mail went out for
 * anyone, so that one is a plain `rate_limited`.
 */
export function classifyAuthError(
  e: { status?: number; code?: string; message?: string; name?: string } | null,
): AuthFailure {
  if (!e) return 'other';
  const { status, code, message = '', name } = e;
  if (code === 'over_email_send_rate_limit') {
    return /only request this after/i.test(message) ? 'email_rate_limited' : 'rate_limited';
  }
  if (code === 'over_request_rate_limit' || status === 429) return 'rate_limited';
  if (
    // auth-js returns network failures (DNS, refused, timeout) as status 0, not as a throw.
    status === 0 ||
    name === 'AuthRetryableFetchError' ||
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
