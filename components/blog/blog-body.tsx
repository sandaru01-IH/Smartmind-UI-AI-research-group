import Markdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { blogMarkdownSchema, keepOnlySiteImages } from '@/lib/blog/markdown';
import { mediaUrl } from '@/lib/supabase/env';

/**
 * Renders a community post. The text is sanitised first, then any image that does not live in the
 * members' storage folder is removed. `imagePrefix` is only passed by tests.
 */
export function BlogBody({
  md,
  imagePrefix = mediaUrl('members/'),
}: {
  md: string;
  imagePrefix?: string | null;
}) {
  return (
    <div className="prose-site">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, blogMarkdownSchema],
          [keepOnlySiteImages, imagePrefix],
        ]}
        components={{
          a: ({ href, children }) => {
            const external = typeof href === 'string' && /^https?:\/\//.test(href);
            return (
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            );
          },
          // The sanitiser only lets through images from our own storage, which are already sized.
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" />
          ),
        }}
      >
        {md}
      </Markdown>
    </div>
  );
}
