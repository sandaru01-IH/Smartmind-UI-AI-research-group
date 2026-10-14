import Link from 'next/link';
import { Suspense } from 'react';
import { PostCard } from '@/components/news/post-card';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/content/strings';
import { getFeaturedPost, getFilterOptions, listPosts } from '@/lib/posts/public';
import { CATEGORIES, type Category } from '@/lib/schemas';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'News',
  description:
    'News, events, publications and partnerships from Smartmind and the Urban Simulation Lab.',
  path: '/news',
});

const PAGE = 9;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function href(params: { category?: string; tag?: string; limit?: number }): string {
  const sp = new URLSearchParams();
  if (params.category) sp.set('category', params.category);
  if (params.tag) sp.set('tag', params.tag);
  if (params.limit && params.limit > PAGE) sp.set('limit', String(params.limit));
  const qs = sp.toString();
  return qs ? `/news?${qs}` : '/news';
}

async function Listing({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const rawCategory = one(sp.category);
  const category = CATEGORIES.includes(rawCategory as Category)
    ? (rawCategory as Category)
    : undefined;
  const tag = one(sp.tag)?.slice(0, 30);
  const limit = Math.min(Math.max(Number(one(sp.limit)) || PAGE, PAGE), 60);
  const filtered = Boolean(category || tag);

  const [{ categories, tags }, featured, { posts }] = await Promise.all([
    getFilterOptions(),
    filtered ? Promise.resolve(null) : getFeaturedPost(),
    listPosts({ type: 'article', category, tag, limit: limit + 2 }),
  ]);
  const rest = posts.filter((p) => p.id !== featured?.id);
  const shown = rest.slice(0, limit);
  const hasMore = rest.length > limit;

  return (
    <div className="container-site pb-24">
      <nav aria-label="Filter news by category" className="flex flex-wrap gap-2">
        <FilterLink to={href({ tag })} active={!category} label={t.common.all} />
        {categories.map((c) => (
          <FilterLink key={c} to={href({ category: c, tag })} active={category === c} label={c} />
        ))}
      </nav>
      {tags.length > 0 ? (
        <nav aria-label="Filter news by tag" className="mt-3 flex flex-wrap gap-2">
          {tags.map((tg) => (
            <FilterLink
              key={tg}
              to={href({ category, tag: tag === tg ? undefined : tg })}
              active={tag === tg}
              label={`#${tg}`}
              mono
            />
          ))}
        </nav>
      ) : null}

      {featured ? (
        <div className="mt-10">
          <p className="label-mono mb-3 text-muted">{t.common.featured}</p>
          <PostCard post={featured} variant="feature" priority as="h2" />
        </div>
      ) : null}

      {shown.length === 0 && !featured ? (
        <div className="mt-12 border border-line p-8">
          <p className="text-lg">{t.common.noResults}</p>
          {filtered ? (
            <p className="mt-4">
              <ButtonLink href="/news" variant="secondary">
                {t.common.clear}
              </ButtonLink>
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <PostCard post={p} as="h2" />
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <div className="mt-10">
          <ButtonLink
            href={href({ category, tag, limit: limit + PAGE })}
            variant="secondary"
            scroll={false}
          >
            {t.common.loadMore}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

function FilterLink({
  to,
  active,
  label,
  mono = false,
}: {
  to: string;
  active: boolean;
  label: string;
  mono?: boolean;
}) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={`inline-flex min-h-11 items-center rounded-sharp border px-4 text-[0.95rem] transition-colors ${
        mono ? 'font-mono text-sm' : ''
      } ${active ? 'border-signal bg-signal text-signal-fg' : 'border-line-strong text-fg hover:bg-surface-2'}`}
    >
      {label}
    </Link>
  );
}

export default function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        eyebrow="News"
        title="What is happening"
        lead="Milestones, events, papers and partnerships. Short updates also run in the Live bar at the top of the site."
      />
      <Suspense
        fallback={
          <div className="container-site pb-24">
            <div className="h-96 border border-line bg-surface" aria-hidden="true" />
          </div>
        }
      >
        <Listing searchParams={searchParams} />
      </Suspense>
    </>
  );
}
