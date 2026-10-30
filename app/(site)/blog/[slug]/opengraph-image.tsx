import { OG_SIZE, renderOgImage } from '@/lib/og-image';
import { authorName } from '@/lib/blog/rows';
import { getPublicBlogPost } from '@/lib/blog/public';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Smartmind blog';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicBlogPost(slug);
  return renderOgImage({
    title: post?.title ?? 'Blog',
    label: post ? `Blog · ${authorName(post.author)}` : 'Blog',
  });
}
