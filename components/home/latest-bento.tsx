import { PostCard } from '@/components/news/post-card';
import { Reveal } from '@/components/ui/reveal';
import { ButtonLink } from '@/components/ui/button';
import { t } from '@/content/strings';
import { getFeaturedPost, listPosts } from '@/lib/posts/public';

/** One featured card plus the most recent items. Data is live, so admin changes show here. */
export async function LatestBento() {
  const featured = await getFeaturedPost();
  const recent = await listPosts({ limit: 8 });
  const rest = recent.posts.filter((p) => p.id !== featured?.id);
  const articles = rest.filter((p) => p.type === 'article').slice(0, 2);
  const updates = rest.filter((p) => p.type === 'update').slice(0, 4);

  if (!featured && rest.length === 0) {
    return <p className="text-muted">Nothing published yet. Check back soon.</p>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {featured ? (
        <Reveal className="lg:col-span-7">
          <PostCard post={featured} variant="feature" priority />
        </Reveal>
      ) : null}
      <div className={`grid gap-5 ${featured ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
        {articles.map((p, i) => (
          <Reveal key={p.id} index={i + 1}>
            <PostCard post={p} />
          </Reveal>
        ))}
        {updates.length > 0 ? (
          <Reveal index={3} className="border border-line bg-surface p-5">
            <p className="label-mono text-muted">{t.ticker.label}</p>
            <div className="mt-2">
              {updates.map((p) => (
                <PostCard key={p.id} post={p} variant="compact" />
              ))}
            </div>
          </Reveal>
        ) : null}
        <div>
          <ButtonLink href="/news" variant="secondary">
            {t.home.allNews}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
