import { isIP } from 'node:net';

/**
 * Vercel sets x-vercel-forwarded-for itself and overwrites x-forwarded-for, so on Vercel it is tried
 * first; anywhere else a client could send it, so it is ignored. The others are fallbacks for other
 * hosts. Only an IP literal is accepted, so a junk header cannot become a throttle key. Returns null
 * when there is no usable address.
 */
export function clientIpFrom(
  h: Pick<Headers, 'get'>,
  trustVercel: boolean = Boolean(process.env.VERCEL),
): string | null {
  const names = ['x-real-ip', 'x-forwarded-for'];
  if (trustVercel) names.unshift('x-vercel-forwarded-for');
  for (const name of names) {
    const first = h.get(name)?.split(',')[0]?.trim();
    if (first && isIP(first)) return first;
  }
  return null;
}
