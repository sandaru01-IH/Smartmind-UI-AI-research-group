import Image from 'next/image';
import { CoverArt } from '@/components/art/cover-art';
import { mediaUrl } from '@/lib/supabase/env';
import type { Post } from '@/lib/posts/types';

/** A post's cover: the uploaded image when there is one, otherwise generated artwork. */
export function PostCover({
  post,
  sizes,
  priority = false,
  className = '',
}: {
  post: Pick<Post, 'slug' | 'category' | 'cover_path' | 'cover_alt'>;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const src = mediaUrl(post.cover_path);
  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden bg-surface-2 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={post.cover_alt ?? ''}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <CoverArt seed={post.slug} category={post.category} />
      )}
    </div>
  );
}
