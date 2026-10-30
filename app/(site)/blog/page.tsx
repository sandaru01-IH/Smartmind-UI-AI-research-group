import Link from 'next/link';
import { Suspense } from 'react';
import { BlogCard } from '@/components/blog/blog-card';
import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { listBlogPosts } from '@/lib/blog/public';
import { pageMeta } from '@/lib/seo';
import { hasSupabase } from '@/lib/supabase/env';

export const metadata = pageMeta({
  title: 'Blog',
  description: 'Writing from people in the Smartmind network: expertise, research and ideas.',
  path: '/blog',
});

const PAGE = 9;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Listing({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, Number.parseInt(raw ?? '1', 10) || 1);
  const { posts, total } = await listBlogPosts({ limit: PAGE, offset: (page - 1) * PAGE });
  if (posts.length === 0) return <p className="text-muted">{t.stories.blogEmpty}</p>;
  const pages = Math.ceil(total / PAGE);
  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <li key={p.id}>
            <Reveal index={i}>
              <BlogCard post={p} as="h2" />
            </Reveal>
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-10 flex flex-wrap items-center gap-3">
          {page > 1 ? (
            <Link
              href={page === 2 ? '/blog' : `/blog?page=${page - 1}`}
              className={buttonClass('secondary')}
            >
              {t.stories.blogNewer}
            </Link>
          ) : null}
          <span className="label-mono text-muted">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link href={`/blog?page=${page + 1}`} className={buttonClass('secondary')}>
              {t.stories.blogOlder}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

export default function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader eyebrow={t.stories.eyebrow} title={t.stories.blogTitle} lead={t.stories.blogLead}>
        {hasSupabase() ? (
          <div className="mt-8 max-w-[58ch] border border-line-strong p-5">
            <p className="font-display text-lg">{t.stories.blogWrite}</p>
            <p className="mt-1 text-muted">{t.stories.blogWriteLead}</p>
            <p className="mt-4 flex flex-wrap gap-3">
              <Link href="/register" className={buttonClass('primary')}>
                {t.stories.blogRegister}
              </Link>
              <Link href="/login?next=%2Fwrite" className={buttonClass('secondary')}>
                {t.stories.blogLogin}
              </Link>
            </p>
          </div>
        ) : null}
      </PageHeader>
      <div className="container-site pb-24">
        <Suspense
          fallback={<div className="h-64 border border-line bg-surface" aria-hidden="true" />}
        >
          <Listing searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
