import { describe, expect, it } from 'vitest';
import { clientIpFrom } from './client-ip';

const h = (init: Record<string, string>) => new Headers(init);

describe('clientIpFrom', () => {
  it.each([
    ['empty header set', {}, null],
    [
      'Vercel header wins over a spoofed x-forwarded-for',
      {
        'x-vercel-forwarded-for': '203.0.113.7',
        'x-forwarded-for': '1.2.3.4, 9.9.9.9',
        'x-real-ip': '5.6.7.8',
      },
      '203.0.113.7',
    ],
    [
      'x-real-ip comes before x-forwarded-for',
      {
        'x-real-ip': '5.6.7.8',
        'x-forwarded-for': '1.2.3.4, 9.9.9.9',
      },
      '5.6.7.8',
    ],
    [
      'first x-forwarded-for entry as the last resort',
      { 'x-forwarded-for': '1.2.3.4, 9.9.9.9' },
      '1.2.3.4',
    ],
    ['IPv6 literal', { 'x-vercel-forwarded-for': '2001:db8::1' }, '2001:db8::1'],
    ['a header holding not-an-ip', { 'x-forwarded-for': 'not-an-ip' }, null],
    [
      'garbage in a preferred header falls through to the next',
      {
        'x-vercel-forwarded-for': 'not-an-ip',
        'x-real-ip': '5.6.7.8',
      },
      '5.6.7.8',
    ],
    [
      'blank headers',
      { 'x-vercel-forwarded-for': ' ', 'x-real-ip': '', 'x-forwarded-for': ', ' },
      null,
    ],
    ['the literal unknown', { 'x-real-ip': 'unknown' }, null],
  ] as const)('%s', (_name, init, expected) => {
    expect(clientIpFrom(h(init))).toBe(expected);
  });
});
