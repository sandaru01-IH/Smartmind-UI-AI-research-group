import { z } from 'zod';
import { readingMinutes } from './reading-time';

export const FORMER_MEMBER_NAME = 'Former member';

/** Who wrote a post. `null` means the writer deleted their account. */
export interface AuthorRef {
  id: string;
  displayName: string;
  bio: string;
  photoPath: string | null;
}

/** A published post as shown on cards and lists: no body. */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverPath: string | null;
  coverAlt: string | null;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  author: AuthorRef | null;
}

/** A published post with its text. */
export interface BlogPost extends BlogPostSummary {
  bodyMd: string;
  updatedAt: string;
  readingMinutes: number;
}

export const authorName = (author: AuthorRef | null): string =>
  author?.displayName ?? FORMER_MEMBER_NAME;

/** Columns for public reads. Names the member columns anonymous visitors may read, never `*`. */
export const BLOG_LIST_COLUMNS =
  'id,slug,title,summary,cover_path,cover_alt,published_at,like_count,' +
  'author:member_profiles!author_id(id,display_name,bio,photo_path),comments:blog_comments(count)';
export const BLOG_POST_COLUMNS = `${BLOG_LIST_COLUMNS},body_md,updated_at`;

const authorRow = z
  .object({
    id: z.string(),
    display_name: z.string(),
    bio: z.string().nullable(),
    photo_path: z.string().nullable(),
  })
  .nullable();

const listRow = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  cover_path: z.string().nullable(),
  cover_alt: z.string().nullable(),
  published_at: z.string(),
  like_count: z.number(),
  author: authorRow,
  comments: z.array(z.object({ count: z.number() })).nullish(),
});

const postRow = listRow.extend({ body_md: z.string().nullable(), updated_at: z.string() });

function summaryOf(row: z.output<typeof listRow>): BlogPostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? '',
    coverPath: row.cover_path,
    coverAlt: row.cover_alt,
    publishedAt: row.published_at,
    likeCount: row.like_count,
    commentCount: row.comments?.[0]?.count ?? 0,
    author: row.author
      ? {
          id: row.author.id,
          displayName: row.author.display_name,
          bio: row.author.bio ?? '',
          photoPath: row.author.photo_path,
        }
      : null,
  };
}

export const parseBlogSummaries = (rows: unknown): BlogPostSummary[] =>
  z
    .array(listRow)
    .parse(rows ?? [])
    .map(summaryOf);

export function parseBlogPost(row: unknown): BlogPost | null {
  if (!row) return null;
  const r = postRow.parse(row);
  const body = r.body_md ?? '';
  return {
    ...summaryOf(r),
    bodyMd: body,
    updatedAt: r.updated_at,
    readingMinutes: readingMinutes(body),
  };
}
