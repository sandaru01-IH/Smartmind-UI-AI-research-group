import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import { AuthorBadge } from '@/components/blog/author-badge';
import { BlogBody } from '@/components/blog/blog-body';
import { CoverArt } from '@/components/art/cover-art';
import { JsonLd } from '@/components/seo/json-ld';
import { BRAND, SITE_URL } from '@/content/brand';
import { t } from '@/content/strings';
import { authorName } from '@/lib/blog/rows';
import { getBlogSlugIndex, getPublicBlogPost } from '@/lib/blog/public';
import { formatDate } from '@/lib/format';
import { mediaUrl } from '@/lib/supabase/env';

type Props = { params: Promise<{ slug: string }> };

/**
 * Cache Components needs at least one static param at build time. A new site has no posts yet (or the
 * database is not reachable while building), so a placeholder slug stands in. It matches no post:
 * visitors get the 404 page for it, like any other unknown address.
 */
const PLACEHOLDER_SLUG = 'no-posts-yet';

export async function generateStaticParams() {
  try {
    const slugs = await getBlogSlugIndex();
    if (slugs.length > 0) return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    // Fall through to the placeholder; posts are still served on demand.
  }
  return [{ slug: PLACEHOLDER_SLUG }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicBlogPost(slug);
  if (!post) return { title: 'Not found', robots: { index: false } };
  const description = post.summary || post.title;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      authors: [authorName(post.author)],
    },
    twitter: { title: post.title, description },
  };
}

async function Article({ params }: Props) {
  const { slug } = await params;
  const post = await getPublicBlogPost(slug);
  if (!post) notFound();
  const cover = mediaUrl(post.coverPath);
  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.summary || undefined,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
          image: cover ?? `${SITE_URL}/blog/${post.slug}/opengraph-image`,
          author: { '@type': 'Person', name: authorName(post.author) },
          publisher: { '@type': 'Organization', name: BRAND.name },
        }}
      />
      <div className="container-site pt-10 md:pt-16">
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-2 text-muted hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t.stories.blogBack}
        </Link>
        <h1 className="mt-6 max-w-[22ch] text-4xl md:text-6xl">{post.title}</h1>
        {post.summary ? (
          <p className="mt-6 max-w-[58ch] text-xl text-muted">{post.summary}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-muted">
          <AuthorBadge author={post.author} />
          <time dateTime={post.publishedAt} className="label-mono">
            {formatDate(post.publishedAt)}
          </time>
          <span className="label-mono">
            {post.readingMinutes} {t.stories.minRead}
          </span>
          <span
            className="label-mono inline-flex items-center gap-1.5"
            aria-label={`${post.likeCount} likes`}
          >
            <Heart size={14} aria-hidden="true" /> {post.likeCount}
          </span>
          <span
            className="label-mono inline-flex items-center gap-1.5"
            aria-label={`${post.commentCount} comments`}
          >
            <MessageCircle size={14} aria-hidden="true" /> {post.commentCount}
          </span>
        </div>
      </div>

      <div className="container-site mt-10 max-w-[1100px]">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
          {cover ? (
            <Image
              src={cover}
              alt={post.coverAlt ?? ''}
              fill
              priority
              sizes="(min-width: 1100px) 1100px, 100vw"
              className="object-cover"
            />
          ) : (
            <CoverArt seed={post.slug} category="Research" />
          )}
        </div>
      </div>

      <div className="container-site mt-12 pb-24">
        <div className="max-w-[70ch]">
          {post.bodyMd ? <BlogBody md={post.bodyMd} /> : null}
          {post.author ? (
            <aside className="mt-14 border-t border-line pt-8" aria-label={authorName(post.author)}>
              <AuthorBadge author={post.author} size={56} />
              {post.author.bio ? <p className="mt-3 text-muted">{post.author.bio}</p> : null}
            </aside>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function BlogPostPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container-site min-h-svh py-16" aria-busy="true" />}>
      <Article params={params} />
    </Suspense>
  );
}
