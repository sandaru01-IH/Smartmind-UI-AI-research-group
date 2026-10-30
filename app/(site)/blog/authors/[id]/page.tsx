import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { AuthorBadge } from '@/components/blog/author-badge';
import { BlogCard } from '@/components/blog/blog-card';
import { Reveal } from '@/components/ui/reveal';
import { t } from '@/content/strings';
import { getAuthor, listBlogPosts } from '@/lib/blog/public';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const author = z.uuid().safeParse(id).success ? await getAuthor(id) : null;
  if (!author) return { title: 'Not found', robots: { index: false } };
  return {
    title: `${t.stories.authorPosts} ${author.displayName}`,
    description: author.bio || `${t.stories.authorPosts} ${author.displayName}`,
    alternates: { canonical: `/blog/authors/${author.id}` },
  };
}

async function Author({ params }: Props) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const author = await getAuthor(id);
  if (!author) notFound();
  const { posts } = await listBlogPosts({ authorId: id, limit: 30 });
  return (
    <>
      <header className="container-site pb-10 pt-10 md:pb-14 md:pt-16">
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-2 text-muted hover:text-fg"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t.stories.blogBack}
        </Link>
        <h1 className="mt-6 text-4xl md:text-5xl">
          <AuthorBadge author={author} size={64} linked={false} />
        </h1>
        {author.bio ? <p className="mt-5 max-w-[58ch] text-lg text-muted">{author.bio}</p> : null}
      </header>
      <div className="container-site pb-24">
        {posts.length === 0 ? (
          <p className="text-muted">{t.stories.authorEmpty}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <li key={p.id}>
                <Reveal index={i}>
                  <BlogCard post={p} as="h2" />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function AuthorPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container-site min-h-svh py-16" aria-busy="true" />}>
      <Author params={params} />
    </Suspense>
  );
}
