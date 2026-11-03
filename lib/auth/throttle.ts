export interface ThrottleOptions {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
  /** Most keys held at once. Default 5000. */
  maxKeys?: number;
  now?: () => number;
}

export interface ThrottleCheck {
  locked: boolean;
  retryAfterSeconds: number;
}

interface Record {
  failures: number[];
  lockedUntil: number;
}

/**
 * Failed-login limiter. Kept in memory per server instance: it slows guessing on one instance, and
 * Supabase Auth applies its own rate limits on top. On several instances (or serverless functions
 * that each start fresh) every instance counts for itself, so the real limit is higher. A shared
 * store (for example Upstash) is the follow-up if that matters.
 *
 * Memory is bounded: the map keeps keys in the order they were last counted, records that can no
 * longer matter (no lock, no failure inside the window) are swept out at least once per window, and
 * above `maxKeys` the key counted longest ago goes first. A locked key is kept until its lock ends,
 * and is only pushed out when every other key is locked too.
 */
export function createThrottle({
  maxFailures,
  windowMs,
  lockMs,
  maxKeys = 5000,
  now = Date.now,
}: ThrottleOptions) {
  const records = new Map<string, Record>();
  let lastSweep = now();

  const prune = (r: Record, t: number) => {
    r.failures = r.failures.filter((f) => t - f < windowMs);
  };
  const isLocked = (r: Record, t: number) => r.lockedUntil > t;
  const isSpent = (r: Record, t: number) =>
    !isLocked(r, t) &&
    (r.failures.length === 0 || t - r.failures[r.failures.length - 1] >= windowMs);

  const sweep = (t: number) => {
    lastSweep = t;
    for (const [k, r] of records) if (isSpent(r, t)) records.delete(k);
  };

  /** Brings the map back to `maxKeys`, never dropping `keep`, the key being counted right now. */
  const evict = (t: number, keep: string) => {
    sweep(t);
    for (const unlockedOnly of [true, false]) {
      for (const [k, r] of records) {
        if (records.size <= maxKeys) return;
        if (k === keep || (unlockedOnly && isLocked(r, t))) continue;
        records.delete(k);
      }
    }
  };

  return {
    check(key: string): ThrottleCheck {
      const r = records.get(key);
      const t = now();
      if (r && isLocked(r, t))
        return { locked: true, retryAfterSeconds: Math.ceil((r.lockedUntil - t) / 1000) };
      return { locked: false, retryAfterSeconds: 0 };
    },
    fail(key: string): void {
      const t = now();
      const r = records.get(key) ?? { failures: [], lockedUntil: 0 };
      // Delete and set again so this key moves to the end: the front is the least recently counted.
      records.delete(key);
      prune(r, t);
      r.failures.push(t);
      if (r.failures.length >= maxFailures) {
        r.lockedUntil = t + lockMs;
        r.failures = [];
      }
      records.set(key, r);
      if (records.size > maxKeys) evict(t, key);
      else if (t - lastSweep >= windowMs) sweep(t);
    },
    reset(key: string): void {
      records.delete(key);
    },
    /** How many keys are held, for tests and monitoring. */
    size(): number {
      return records.size;
    },
  };
}

export const loginThrottle = createThrottle({
  maxFailures: 5,
  windowMs: 15 * 60_000,
  lockMs: 15 * 60_000,
});

/**
 * The address header can be forged, so a guesser could change it on every try to dodge the limit
 * above. This second limiter counts failures per account regardless of address. Its limit is higher
 * so a stranger cannot lock the real admin out with a handful of wrong passwords.
 */
export const accountThrottle = createThrottle({
  maxFailures: 20,
  windowMs: 60 * 60_000,
  lockMs: 15 * 60_000,
});

/** Member sign-up: every attempt counts, so one address cannot create accounts in bulk. */
export const registerThrottle = createThrottle({
  maxFailures: 5,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
});

/** Member log-in failures per address and email. */
export const memberLoginThrottle = createThrottle({
  maxFailures: 8,
  windowMs: 15 * 60_000,
  lockMs: 15 * 60_000,
});

/** Member log-in failures per email, whatever the address. */
export const memberAccountThrottle = createThrottle({
  maxFailures: 20,
  windowMs: 60 * 60_000,
  lockMs: 15 * 60_000,
});

/** Password-reset emails per address. */
export const resetThrottle = createThrottle({
  maxFailures: 5,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
});

/** Confirmation emails sent again, per address: every attempt counts. */
export const resendThrottle = createThrottle({
  maxFailures: 3,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
});

/** The same per email, whatever the address, so rotating addresses cannot flood one inbox. */
export const resendEmailThrottle = createThrottle({
  maxFailures: 3,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
});

/** New passwords set per user: every attempt counts. */
export const passwordChangeThrottle = createThrottle({
  maxFailures: 5,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
});
