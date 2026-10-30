import Image from 'next/image';
import Link from 'next/link';
import { authorName, type AuthorRef } from '@/lib/blog/rows';
import { mediaUrl } from '@/lib/supabase/env';

/** The writer's photo and name, linking to their page. A deleted account shows as "Former member". */
export function AuthorBadge({
  author,
  size = 36,
  linked = true,
}: {
  author: AuthorRef | null;
  size?: number;
  linked?: boolean;
}) {
  const name = authorName(author);
  const src = mediaUrl(author?.photoPath);
  const face = (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-sm text-muted"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
  const inner = (
    <span className="inline-flex items-center gap-3">
      {face}
      <span>{name}</span>
    </span>
  );
  if (!author || !linked) return inner;
  return (
    <Link href={`/blog/authors/${author.id}`} className="hover:underline">
      {inner}
    </Link>
  );
}
