import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from './site-url';

describe('resolveSiteUrl', () => {
  it('returns the configured address without a trailing slash', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: ' https://www.example.org/ ' })).toBe(
      'https://www.example.org',
    );
  });

  it('falls back to localhost when nothing is set outside a Vercel production build', () => {
    expect(resolveSiteUrl({})).toBe('http://localhost:3000');
    expect(resolveSiteUrl({ VERCEL_ENV: 'preview' })).toBe('http://localhost:3000');
    expect(resolveSiteUrl({ VERCEL_ENV: 'development' })).toBe('http://localhost:3000');
  });

  it('refuses a Vercel production build when the address is not set', () => {
    expect(() => resolveSiteUrl({ VERCEL_ENV: 'production' })).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() => resolveSiteUrl({ VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: '  ' })).toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it('refuses a Vercel production build that points at localhost', () => {
    expect(() =>
      resolveSiteUrl({ VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://localhost:3000' }),
    ).toThrow(/localhost/);
    expect(() =>
      resolveSiteUrl({ VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://127.0.0.1' }),
    ).toThrow(/localhost/);
  });

  it('refuses a Vercel production build that is not https', () => {
    expect(() =>
      resolveSiteUrl({ VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://www.example.org' }),
    ).toThrow(/https/);
  });

  it('accepts the real https address in production', () => {
    expect(
      resolveSiteUrl({ VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://www.example.org' }),
    ).toBe('https://www.example.org');
  });

  it('keeps localhost usable for preview deployments', () => {
    expect(
      resolveSiteUrl({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }),
    ).toBe('http://localhost:3000');
  });

  it('rejects an address typed without http:// or https://', () => {
    expect(() => resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'www.example.org' })).toThrow(
      /http:\/\/ or https:\/\//,
    );
  });
});
