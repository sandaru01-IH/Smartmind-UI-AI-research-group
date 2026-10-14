import { OG_SIZE, renderOgImage } from '@/lib/og-image';
import { getPublicPost } from '@/lib/posts/public';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Smartmind news';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicPost(slug);
  return renderOgImage({ title: post?.title ?? 'News', label: post?.category ?? 'News' });
}
