export interface ThrottleOptions {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
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
 * Supabase Auth applies its own rate limits on top. Swap the Map for a shared store (for example
 * Upstash) if the site runs on many instances.
 */
export function createThrottle({ maxFailures, windowMs, lockMs, now = Date.now }: ThrottleOptions) {
  const records = new Map<string, Record>();

  const prune = (r: Record, t: number) => {
    r.failures = r.failures.filter((f) => t - f < windowMs);
  };

  return {
    check(key: string): ThrottleCheck {
      const r = records.get(key);
      const t = now();
      if (r && r.lockedUntil > t) return { locked: true, retryAfterSeconds: Math.ceil((r.lockedUntil - t) / 1000) };
      return { locked: false, retryAfterSeconds: 0 };
    },
    fail(key: string): void {
      const t = now();
      const r = records.get(key) ?? { failures: [], lockedUntil: 0 };
      prune(r, t);
      r.failures.push(t);
      if (r.failures.length >= maxFailures) {
        r.lockedUntil = t + lockMs;
        r.failures = [];
      }
      records.set(key, r);
      if (records.size > 5000) {
        for (const [k, v] of records) if (v.lockedUntil < t && v.failures.length === 0) records.delete(k);
      }
    },
    reset(key: string): void {
      records.delete(key);
    },
  };
}

export const loginThrottle = createThrottle({ maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 });
