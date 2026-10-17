import { z } from 'zod';
import { CATEGORIES, PLATFORMS } from '@/lib/schemas';
import type { Post } from './types';

/** Validates rows coming back from Postgres so the app never trusts raw `unknown`. */
export const postRowSchema = z.object({
  id: z.string(),
  type: z.enum(['article', 'update']),
  title: z.string(),
  slug: z.string(),
  excerpt: z
    .string()
    .nullable()
    .transform((v) => v ?? ''),
  body_md: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  category: z.enum(CATEGORIES),
  tags: z
    .array(z.string())
    .nullable()
    .transform((v) => v ?? []),
  cover_path: z.string().nullable(),
  cover_alt: z.string().nullable(),
  link_url: z.string().nullable(),
  event_date: z.string().nullable(),
  featured: z.boolean(),
  status: z.enum(['draft', 'published']),
  published_at: z.string().nullable(),
  author_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  show_in_news: z.boolean().default(true),
  show_in_ticker: z.boolean().default(false),
  in_gallery: z.boolean().default(false),
  in_publications: z.boolean().default(false),
  in_awards: z.boolean().default(false),
  tbc: z.boolean().default(false),
  video_url: z.string().nullable().default(null),
  gallery_paths: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  external_links: z
    .array(z.object({ platform: z.enum(PLATFORMS), url: z.string() }))
    .nullish()
    .transform((v) => v ?? []),
});

export function parsePostRows(rows: unknown): Post[] {
  return z.array(postRowSchema).parse(rows ?? []);
}

export function parsePostRow(row: unknown): Post | null {
  if (!row) return null;
  return postRowSchema.parse(row);
}

const LIST_COLUMNS =
  'id,type,title,slug,excerpt,category,tags,cover_path,cover_alt,link_url,event_date,featured,status,published_at,author_id,created_at,updated_at,show_in_news,show_in_ticker,in_gallery,in_publications,in_awards,tbc,video_url,external_links';

/** Everything about a post. */
export const POST_COLUMNS = `${LIST_COLUMNS},body_md,gallery_paths`;

/** The admin table and dashboard figures need no article body or photo list. */
export const POST_LIST_COLUMNS = LIST_COLUMNS;
