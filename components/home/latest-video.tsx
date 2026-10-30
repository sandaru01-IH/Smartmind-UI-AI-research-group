import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { VideoCard } from '@/components/videos/video-card';
import { t } from '@/content/strings';
import { getHomeSections } from '@/lib/home/sections';
import { getChannelVideos } from '@/lib/youtube/public';

/** The newest channel video. Renders nothing when the admin switched it off or there is no video. */
export async function LatestVideo() {
  const [sections, videos] = await Promise.all([getHomeSections(), getChannelVideos(1)]);
  const video = videos[0];
  if (!sections.video || !video) return null;
  return (
    <Section
      id="latest-video"
      title={t.home.latestVideo}
      lead={t.home.latestVideoLead}
      action={
        <ButtonLink href="/videos" variant="secondary">
          {t.home.allVideos}
        </ButtonLink>
      }
    >
      <Reveal className="max-w-3xl">
        <VideoCard video={video} />
      </Reveal>
    </Section>
  );
}
