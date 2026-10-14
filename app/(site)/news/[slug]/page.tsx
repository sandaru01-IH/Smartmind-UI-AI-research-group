import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PostBody } from '@/components/ui/markdown';
import { PostCover } from '@/components/news/post-cover';
import { ButtonLink } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/json-ld';
import { Tag } from '@/components/ui/tag';
import { BRAND, SITE_URL } from '@/content/brand';
import { formatDate } from '@/lib/format';
import { getPublicPost, getSlugIndex } from '@/lib/posts/public';
import { mediaUrl } from '@/lib/supabase/env';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await getSlugIndex();
    return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) return { title: 'Not found', robots: { index: false } };
  const description = post.excerpt || post.title;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/news/${post.slug}`,
      publishedTime: post.published_at ?? undefined,
    },
    twitter: { title: post.title, description },
  };
}

/** The article itself. Reads the slug at request time, so it renders inside a Suspense boundary. */
async function Article({ params }: Props) {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  if (!post) notFound();

  const cover = mediaUrl(post.cover_path);
  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: post.title,
          description: post.excerpt || undefined,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          mainEntityOfPage: `${SITE_URL}/news/${post.slug}`,
          image: cover ?? `${SITE_URL}/news/${post.slug}/opengraph-image`,
          publisher: { '@type': 'Organization', name: BRAND.name },
        }}
      />
      <div className="container-site pt-10 md:pt-16">
        <Link
          href="/news"
          className="inline-flex min-h-11 items-center gap-2 text-muted hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          All news
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Tag>{post.category}</Tag>
          <time dateTime={post.published_at ?? undefined} className="label-mono text-muted">
            {formatDate(post.published_at)}
          </time>
          {post.event_date ? (
            <span className="label-mono text-muted">
              Event: <time dateTime={post.event_date}>{formatDate(post.event_date)}</time>
            </span>
          ) : null}
        </div>
        <h1 className="mt-5 max-w-[22ch] text-4xl md:text-6xl">{post.title}</h1>
        {post.excerpt ? (
          <p className="mt-6 max-w-[58ch] text-xl text-muted">{post.excerpt}</p>
        ) : null}
      </div>

      <div className="container-site mt-10 max-w-[1100px]">
        <PostCover post={post} priority sizes="(min-width: 1100px) 1100px, 100vw" />
      </div>

      <div className="container-site grid-12 mt-12 gap-y-10 pb-24">
        <div className="col-span-12 lg:col-span-8">
          {post.body_md ? <PostBody source={post.body_md} /> : null}
          {post.link_url ? (
            <p className="mt-10">
              <ButtonLink href={post.link_url}>Read the source</ButtonLink>
            </p>
          ) : null}
        </div>
        {post.tags.length > 0 ? (
          <aside className="col-span-12 lg:col-span-3 lg:col-start-10" aria-label="Tags">
            <p className="label-mono text-muted">Tags</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tg) => (
                <li key={tg}>
                  <Link
                    href={`/news?tag=${encodeURIComponent(tg)}`}
                    className="inline-flex min-h-11 items-center"
                  >
                    <Tag>#{tg}</Tag>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </article>
  );
}

export default function PostPage({ params }: Props) {
  return (
    // The fallback is as tall as a screen, so the footer stays below the fold while a new post loads.
    <Suspense fallback={<div className="container-site min-h-svh py-16" aria-busy="true" />}>
      <Article params={params} />
    </Suspense>
  );
}
