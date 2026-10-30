import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { loadChannelVideos, type VideoItem } from './feed';

/**
 * The channel's newest videos, cached for about an hour. An empty answer (YouTube unreachable and no
 * earlier list) is only cached for a minute so the page recovers quickly. Tag: 'videos'.
 */
export async function getChannelVideos(limit?: number): Promise<VideoItem[]> {
  'use cache';
  cacheTag('videos');
  const videos = await loadChannelVideos(limit);
  if (videos.length > 0) cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  else cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  return videos;
}
