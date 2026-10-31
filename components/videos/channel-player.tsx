'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { YOUTUBE_CHANNEL_ID } from '@/content/brand';
import { t } from '@/content/strings';

/**
 * The channel's newest uploads in one player, for when the list of individual videos cannot be
 * read (YouTube's feed is down and there is no API key). It uses YouTube's own embed of the
 * channel's "uploads" playlist (the channel id with UC changed to UU), so it needs no key and no
 * feed. Like the single-video player it loads nothing from YouTube until the visitor presses play.
 */
export function ChannelPlayer() {
  const [playing, setPlaying] = useState(false);
  const list = `UU${YOUTUBE_CHANNEL_ID.slice(2)}`;
  return (
    <div className="relative aspect-video w-full overflow-hidden border border-line bg-surface-2">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=1&rel=0`}
          title={t.stories.videosPlayerTitle}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-5 px-6 text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-signal text-signal-fg transition-transform duration-300 group-hover:scale-110 md:h-20 md:w-20">
            <Play size={28} aria-hidden="true" fill="currentColor" />
          </span>
          <span className="font-display text-xl tracking-tight">{t.stories.videosPlayLatest}</span>
        </button>
      )}
    </div>
  );
}
