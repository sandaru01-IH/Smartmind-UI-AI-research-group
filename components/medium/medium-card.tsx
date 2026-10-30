import Image from 'next/image';
import { CoverArt } from '@/components/art/cover-art';
import { ExternalLink } from '@/components/ui/external-link';
import { t } from '@/content/strings';
import type { MediumArticle } from '@/lib/catalog/types';
import { formatDate } from '@/lib/format';
import { mediaUrl } from '@/lib/supabase/env';

/** A Medium article. The whole card opens the article on Medium in a new tab. */
export function MediumCard({
  article,
  as: Heading = 'h3',
}: {
  article: MediumArticle;
  as?: 'h2' | 'h3';
}) {
  const src = mediaUrl(article.cover_path);
  return (
    <article className="group relative flex h-full flex-col border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
        {src ? (
          <Image
            src={src}
            alt={article.cover_alt ?? ''}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <CoverArt seed={article.id} category="Publication" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-mono text-muted">{t.stories.mediumBadge}</span>
          {article.published_on ? (
            <time dateTime={article.published_on} className="label-mono text-muted">
              {formatDate(article.published_on)}
            </time>
          ) : null}
        </div>
        <Heading className="text-xl">
          <ExternalLink
            href={article.url}
            className="after:absolute after:inset-0 group-hover:underline"
          >
            {article.title}
          </ExternalLink>
        </Heading>
        {article.summary ? <p className="text-muted">{article.summary}</p> : null}
        {article.author_name ? (
          <p className="mt-auto text-sm text-muted">{article.author_name}</p>
        ) : null}
      </div>
    </article>
  );
}
