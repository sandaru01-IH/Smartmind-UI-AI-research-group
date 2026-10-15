import { PostCard } from '@/components/news/post-card';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { ButtonLink } from '@/components/ui/button';
import { t } from '@/content/strings';
import { getFeaturedPost, listPosts } from '@/lib/posts/public';

/**
 * The home "Latest" section. It exists only when the admin has published news: with nothing
 * published it renders nothing at all, so the page never shows an empty placeholder. Every card
 * carries the thumbnail the admin set for it.
 */
export async function LatestSection() {
  const [featured, recent] = await Promise.all([
    getFeaturedPost(),
    listPosts({ type: 'article', news: true, limit: 4 }),
  ]);
  const rest = recent.posts.filter((p) => p.id !== featured?.id).slice(0, 3);
  if (!featured && rest.length === 0) return null;

  return (
    <Section
      id="latest"
      title={t.home.latest}
      lead={t.home.latestLead}
      action={
        <ButtonLink href="/news" variant="secondary">
          {t.home.allNews}
        </ButtonLink>
      }
    >
      <div className="grid gap-5 lg:grid-cols-12">
        {featured ? (
          <Reveal className="lg:col-span-7">
            <PostCard post={featured} variant="feature" priority />
          </Reveal>
        ) : null}
        <div
          className={`grid gap-5 ${featured ? 'lg:col-span-5' : 'lg:col-span-12 lg:grid-cols-3'}`}
        >
          {rest.map((p, i) => (
            <Reveal key={p.id} index={i + 1}>
              <PostCard post={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
