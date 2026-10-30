'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { t } from '@/content/strings';
import type { VideoItem } from '@/lib/youtube/feed';

/**
 * Shows the video's thumbnail with a play button. YouTube's player is only loaded, from the
 * privacy-friendly nocookie domain, once the visitor presses play.
 */
export function VideoPlayer({ video, priority = false }: { video: VideoItem; priority?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
      {playing ? (
        <iframe
          src={`${video.embedUrl}?autoplay=1&rel=0`}
          title={video.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${t.videos.play}: ${video.title}`}
          className="group absolute inset-0 block h-full w-full"
        >
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-signal text-bg">
              <Play size={24} aria-hidden="true" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
