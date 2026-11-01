import { isIP } from 'node:net';

const HEADERS = ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for'] as const;

/**
 * Vercel sets x-vercel-forwarded-for itself and overwrites x-forwarded-for, so it is tried first; the
 * others are fallbacks for other hosts. Only an IP literal is accepted, so a junk header cannot
 * become a throttle key. Returns null when there is no usable address.
 */
export function clientIpFrom(h: Pick<Headers, 'get'>): string | null {
  for (const name of HEADERS) {
    const first = h.get(name)?.split(',')[0]?.trim();
    if (first && isIP(first)) return first;
  }
  return null;
}
