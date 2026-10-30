import { YOUTUBE_CHANNEL_ID } from '@/content/brand';

export interface VideoItem {
  id: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  watchUrl: string;
  embedUrl: string;
}

const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
const VIDEO_ID = /^[\w-]{11}$/;
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1].trim()) : null;
};

/** The channel's videos from its public Atom feed. Entries without a valid id are skipped. */
export function parseYoutubeFeed(xml: string): VideoItem[] {
  const videos: VideoItem[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = tag(m[1], 'yt:videoId');
    const title = tag(m[1], 'title');
    const publishedAt = tag(m[1], 'published');
    if (!id || !VIDEO_ID.test(id) || !title || !publishedAt) continue;
    videos.push({
      id,
      title,
      publishedAt,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    });
  }
  return videos;
}

/** Fetches and parses the feed. Throws on a bad status, a timeout or an answer with no videos. */
export async function fetchChannelVideos(fetchImpl: typeof fetch = fetch): Promise<VideoItem[]> {
  const res = await fetchImpl(FEED_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`YouTube feed answered ${res.status}`);
  const videos = parseYoutubeFeed(await res.text());
  if (videos.length === 0) throw new Error('YouTube feed held no videos');
  return videos;
}

let lastGood: VideoItem[] = [];

/** Test hook: forget the remembered list. */
export function resetLastGoodVideos(): void {
  lastGood = [];
}

/**
 * The newest videos, or the last good list when YouTube cannot be reached, or an empty list when
 * there has never been one. Never throws.
 */
export async function loadChannelVideos(
  limit?: number,
  fetchImpl: typeof fetch = fetch,
): Promise<VideoItem[]> {
  try {
    lastGood = await fetchChannelVideos(fetchImpl);
  } catch {
    // Keep serving whatever worked last.
  }
  return limit ? lastGood.slice(0, limit) : lastGood;
}
