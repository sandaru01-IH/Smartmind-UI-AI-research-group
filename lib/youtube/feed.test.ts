import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  fetchChannelVideos,
  fetchChannelVideosFromApi,
  loadChannelVideos,
  parseYoutubeFeed,
  resetLastGoodVideos,
} from './feed';

const fixture = readFileSync(path.join(import.meta.dirname, 'fixtures/feed.xml'), 'utf8');

const entry = (id: string, title: string) => `
  <entry>
    <yt:videoId>${id}</yt:videoId>
    <title>${title}</title>
    <published>2026-05-04T02:12:40+00:00</published>
  </entry>`;
const feedOf = (...entries: string[]) =>
  `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><title>Channel</title>${entries.join('')}</feed>`;

const response = (body: string, status = 200) => new Response(body, { status });

describe('parseYoutubeFeed', () => {
  it('reads the real channel feed into videos, newest first as served', () => {
    const videos = parseYoutubeFeed(fixture);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos[0].id).toMatch(/^[\w-]{11}$/);
    expect(videos[0].embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${videos[0].id}`);
    expect(videos[0].watchUrl).toBe(`https://www.youtube.com/watch?v=${videos[0].id}`);
    expect(videos[0].thumbnailUrl).toBe(`https://i.ytimg.com/vi/${videos[0].id}/hqdefault.jpg`);
  });

  it('does not treat the channel title as a video', () => {
    expect(parseYoutubeFeed(fixture).map((v) => v.title)).not.toContain('Smart Mind UI & AI');
  });

  it('decodes XML entities in titles', () => {
    const [v] = parseYoutubeFeed(
      feedOf(entry('abcdefghijk', 'Cities &amp; Love: it&#39;s &quot;big&quot; &lt;3')),
    );
    expect(v.title).toBe('Cities & Love: it\'s "big" <3');
  });

  it('skips entries with a bad video id and returns [] for junk', () => {
    expect(parseYoutubeFeed(feedOf(entry('short', 'Bad id')))).toEqual([]);
    expect(parseYoutubeFeed('<html>not a feed</html>')).toEqual([]);
    expect(parseYoutubeFeed('')).toEqual([]);
    expect(parseYoutubeFeed(feedOf())).toEqual([]);
  });
});

describe('fetchChannelVideos', () => {
  it('throws when YouTube answers with an error', async () => {
    await expect(fetchChannelVideos(async () => response('nope', 500))).rejects.toThrow();
  });

  it('throws when the answer holds no videos at all', async () => {
    await expect(fetchChannelVideos(async () => response('<html></html>'))).rejects.toThrow();
  });

  it('returns the parsed videos on success', async () => {
    const videos = await fetchChannelVideos(async () => response(fixture));
    expect(videos.length).toBeGreaterThan(0);
  });
});

describe('loadChannelVideos', () => {
  beforeEach(() => resetLastGoodVideos());

  it('returns an empty list when the feed fails and nothing was ever fetched', async () => {
    expect(await loadChannelVideos(undefined, async () => response('', 503))).toEqual([]);
  });

  it('falls back to the last good list when a later fetch fails', async () => {
    const good = await loadChannelVideos(undefined, async () => response(fixture));
    expect(good.length).toBeGreaterThan(0);
    const later = await loadChannelVideos(undefined, async () => {
      throw new Error('network down');
    });
    expect(later).toEqual(good);
  });

  it('honours the limit', async () => {
    const one = await loadChannelVideos(1, async () => response(fixture));
    expect(one).toHaveLength(1);
  });
});

describe('the YouTube Data API fallback', () => {
  const item = (id: string, title: string, at = '2026-10-28T10:00:00Z') => ({
    snippet: { title, resourceId: { videoId: id } },
    contentDetails: { videoPublishedAt: at },
  });
  const apiBody = (...items: object[]) => JSON.stringify({ items });
  /** Answers like YouTube today: the feed is broken, the API works. */
  const feedDownApiUp =
    (body: string, calls: string[] = []) =>
    async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      return url.includes('googleapis.com') ? response(body) : response('Not found', 404);
    };

  beforeEach(() => resetLastGoodVideos());

  it('reads the newest uploads from the API', async () => {
    const videos = await fetchChannelVideosFromApi('KEY', async () =>
      response(apiBody(item('abcdefghijk', 'First'), item('lmnopqrstuv', 'Second'))),
    );
    expect(videos.map((v) => v.title)).toEqual(['First', 'Second']);
    expect(videos[0]).toMatchObject({
      id: 'abcdefghijk',
      publishedAt: '2026-10-28T10:00:00Z',
      watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      embedUrl: 'https://www.youtube-nocookie.com/embed/abcdefghijk',
      thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    });
  });

  it('skips private and deleted videos and bad ids', async () => {
    const videos = await fetchChannelVideosFromApi('KEY', async () =>
      response(
        apiBody(
          item('abcdefghijk', 'Private video'),
          item('lmnopqrstuv', 'Deleted video'),
          item('bad', 'Bad id'),
          item('wxyzabcdefg', 'Real one'),
        ),
      ),
    );
    expect(videos.map((v) => v.title)).toEqual(['Real one']);
  });

  it('asks for the uploads playlist of the channel', async () => {
    const calls: string[] = [];
    await fetchChannelVideosFromApi('KEY', async (input) => {
      calls.push(String(input));
      return response(apiBody(item('abcdefghijk', 'First')));
    });
    expect(calls[0]).toContain('/youtube/v3/playlistItems');
    expect(calls[0]).toContain('playlistId=UUN7fW6O_yGOuJrma_B4ywlA');
  });

  it('throws without echoing the key when the API answers with an error', async () => {
    const run = fetchChannelVideosFromApi('SECRET-KEY', async () => response('quota', 403));
    await expect(run).rejects.toThrow(/403/);
    await expect(run).rejects.not.toThrow(/SECRET-KEY/);
  });

  it('is used when the feed fails and a key is set', async () => {
    const videos = await loadChannelVideos(
      undefined,
      feedDownApiUp(apiBody(item('abcdefghijk', 'From the API'))),
      'KEY',
    );
    expect(videos.map((v) => v.title)).toEqual(['From the API']);
  });

  it('is not used while the feed works', async () => {
    const calls: string[] = [];
    await loadChannelVideos(
      undefined,
      async (input) => {
        calls.push(String(input));
        return response(fixture);
      },
      'KEY',
    );
    expect(calls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });

  it('is not tried without a key', async () => {
    const calls: string[] = [];
    const videos = await loadChannelVideos(undefined, feedDownApiUp('{}', calls), undefined);
    expect(videos).toEqual([]);
    expect(calls.some((u) => u.includes('googleapis.com'))).toBe(false);
  });

  it('falls back to the last good list when both the feed and the API fail', async () => {
    const good = await loadChannelVideos(undefined, async () => response(fixture), 'KEY');
    const later = await loadChannelVideos(undefined, async () => response('down', 500), 'KEY');
    expect(later).toEqual(good);
  });
});
