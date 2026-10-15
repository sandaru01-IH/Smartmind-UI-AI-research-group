/**
 * Turns a YouTube or Vimeo address into a privacy-friendly embed address. Anything else returns
 * null, so only these two hosts are ever framed (the CSP allows the same two).
 */
export function embedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  const id = /^[\w-]{6,20}$/;

  if (host === 'youtu.be') {
    const v = u.pathname.slice(1);
    return id.test(v) ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    const v =
      u.pathname === '/watch'
        ? u.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(parts[0] ?? '')
          ? parts[1]
          : null;
    return v && id.test(v) ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = u.pathname.split('/').filter(Boolean).pop();
    return v && /^\d{5,12}$/.test(v) ? `https://player.vimeo.com/video/${v}` : null;
  }
  return null;
}
