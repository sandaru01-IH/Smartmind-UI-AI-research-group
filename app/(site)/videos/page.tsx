import { Suspense } from 'react';
import { ChannelPlayer } from '@/components/videos/channel-player';
import { VideoCard } from '@/components/videos/video-card';
import { ExternalLink } from '@/components/ui/external-link';
import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { LINKS } from '@/content/brand';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';
import { getChannelVideos } from '@/lib/youtube/public';

export const metadata = pageMeta({
  title: 'Videos',
  description: 'Videos from the Smartmind YouTube channel.',
  path: '/videos',
});

async function Videos() {
  const videos = await getChannelVideos();
  if (videos.length === 0) {
    // The channel's list could not be read: offer YouTube's own player of the channel's uploads.
    return (
      <div className="max-w-4xl">
        <ChannelPlayer />
        <p className="mt-4 text-muted">{t.stories.videosPlayerNote}</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v, i) => (
        <li key={v.id}>
          <Reveal index={i}>
            <VideoCard video={v} as="h2" priority={i < 3} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

export default function VideosPage() {
  return (
    <>
      <PageHeader
        eyebrow={t.stories.eyebrow}
        title={t.stories.videosTitle}
        lead={t.stories.videosLead}
      >
        <p className="mt-6">
          <ExternalLink
            href={LINKS.youtube}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {t.stories.videosChannel}
          </ExternalLink>
        </p>
      </PageHeader>
      <div className="container-site pb-24">
        <Suspense
          fallback={<div className="h-64 border border-line bg-surface" aria-hidden="true" />}
        >
          <Videos />
        </Suspense>
      </div>
    </>
  );
}
