/**
 * True when the session was opened by an emailed link within the last `maxAgeSeconds`. GoTrue
 * records a reset link in the token's `amr` claim as `{ method: 'otp', timestamp }` (seconds), the
 * same as any other emailed link; a password login is `method: 'password'`. Only such a session may
 * set a new password without the old one. The difference is taken both ways because the auth
 * server's clock can run a little ahead of this one.
 */
export function isRecentRecovery(amr: unknown, nowSeconds: number, maxAgeSeconds = 900): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    return (
      (method === 'otp' || method === 'recovery') &&
      typeof timestamp === 'number' &&
      Math.abs(nowSeconds - timestamp) <= maxAgeSeconds
    );
  });
}
