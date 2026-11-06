const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

/**
 * Works out the public address of the site. Canonical links, the sitemap, robots.txt and the
 * share images all start from it.
 *
 * A live (Vercel production) build refuses to continue when the address is missing, points at
 * localhost, or is not https. Without that, Google is told the site lives at localhost and never
 * indexes the real one, and nothing in the build or the page shows it.
 */
export function resolveSiteUrl(env: {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_ENV?: string;
}): string {
  const live = env.VERCEL_ENV === 'production';
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';

  if (!raw) {
    if (live) {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL is not set. Add it in Vercel (Settings > Environment Variables, Production), for example https://www.smartminduiai.com, then redeploy.',
      );
    }
    return 'http://localhost:3000';
  }

  if (!/^https?:\/\//i.test(raw)) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must start with http:// or https://, but it is "${raw}".`,
    );
  }

  const url = raw.replace(/\/+$/, '');
  if (live) {
    if (LOCAL_HOSTS.has(new URL(url).hostname)) {
      throw new Error(
        `NEXT_PUBLIC_SITE_URL points at localhost ("${url}") in a live build. Set it to the real address, for example https://www.smartminduiai.com.`,
      );
    }
    if (!/^https:\/\//i.test(url)) {
      throw new Error(`NEXT_PUBLIC_SITE_URL must use https in a live build, but it is "${url}".`);
    }
  }
  return url;
}
