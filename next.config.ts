import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

function supabaseOrigin(): URL | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

const supabase = supabaseOrigin();
const supabaseIsLocal = supabase ? ['localhost', '127.0.0.1'].includes(supabase.hostname) : false;

/**
 * Static CSP. A per-request nonce would force every page to render dynamically, which would undo
 * the cached public pages. Scripts are therefore limited to 'self' plus Next's own inline bootstrap.
 * Everything else is locked down. See docs/design-spec.md, section 7.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${supabase ? ` ${supabase.origin}` : ''}`,
  "font-src 'self'",
  `connect-src 'self'${supabase ? ` ${supabase.origin}` : ''}${isDev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(isDev
    ? []
    : [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    ...(supabase
      ? {
          remotePatterns: [
            {
              protocol: supabase.protocol.replace(':', '') as 'http' | 'https',
              hostname: supabase.hostname,
              port: supabase.port,
              pathname: '/storage/v1/object/public/media/**',
            },
          ],
          dangerouslyAllowLocalIP: supabaseIsLocal,
        }
      : {}),
  },
  async redirects() {
    return [
      { source: '/chatbots', destination: '/research#journey', permanent: true },
      { source: '/partners', destination: '/gallery#partners', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
