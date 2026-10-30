import { VideoPlayer } from './video-player';
import { formatDate } from '@/lib/format';
import type { VideoItem } from '@/lib/youtube/feed';

/** A playable video with its title and date. */
export function VideoCard({
  video,
  as: Heading = 'h3',
  priority = false,
}: {
  video: VideoItem;
  as?: 'h2' | 'h3';
  priority?: boolean;
}) {
  return (
    <article className="flex h-full flex-col border border-line bg-surface">
      <VideoPlayer video={video} priority={priority} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <time dateTime={video.publishedAt} className="label-mono text-muted">
          {formatDate(video.publishedAt)}
        </time>
        <Heading className="text-xl">{video.title}</Heading>
      </div>
    </article>
  );
}
