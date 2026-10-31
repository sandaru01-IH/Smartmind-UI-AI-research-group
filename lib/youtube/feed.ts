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

/**
 * The channel's newest uploads from the official YouTube Data API (the channel's "uploads" playlist,
 * whose id is the channel id with UC changed to UU). This is the backup for the public feed above,
 * which YouTube answers with 404 or 500 now and then. It needs an API key, kept on the server only.
 * Private and deleted videos are skipped. Errors never contain the key.
 */
export async function fetchChannelVideosFromApi(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VideoItem[]> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    playlistId: `UU${YOUTUBE_CHANNEL_ID.slice(2)}`,
    maxResults: '15',
    key: apiKey,
  });
  const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`YouTube API answered ${res.status}`);
  const body = (await res.json()) as {
    items?: {
      snippet?: { title?: string; publishedAt?: string; resourceId?: { videoId?: string } };
      contentDetails?: { videoPublishedAt?: string };
    }[];
  };
  const videos: VideoItem[] = [];
  for (const item of body.items ?? []) {
    const id = item.snippet?.resourceId?.videoId;
    const title = item.snippet?.title;
    const publishedAt = item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt;
    if (!id || !VIDEO_ID.test(id) || !title || !publishedAt) continue;
    if (title === 'Private video' || title === 'Deleted video') continue;
    videos.push({
      id,
      title,
      publishedAt,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    });
  }
  if (videos.length === 0) throw new Error('YouTube API held no videos');
  return videos;
}

let lastGood: VideoItem[] = [];

/** Test hook: forget the remembered list. */
export function resetLastGoodVideos(): void {
  lastGood = [];
}

/**
 * The newest videos: from the public feed, or from the official API when the feed fails and a key
 * is set, or the last good list when neither answers, or an empty list when there has never been
 * one. Never throws.
 */
export async function loadChannelVideos(
  limit?: number,
  fetchImpl: typeof fetch = fetch,
  apiKey: string | undefined = process.env.YOUTUBE_API_KEY?.trim() || undefined,
): Promise<VideoItem[]> {
  try {
    lastGood = await fetchChannelVideos(fetchImpl);
  } catch {
    // The feed is down. Ask the official API if there is a key; otherwise keep whatever worked last.
    if (apiKey) {
      try {
        lastGood = await fetchChannelVideosFromApi(apiKey, fetchImpl);
      } catch {
        // Keep serving whatever worked last.
      }
    }
  }
  return limit ? lastGood.slice(0, limit) : lastGood;
}
