import type { Category, ExternalLinkValue } from '@/lib/schemas';
import type { PostStatus } from '@/lib/visibility';

export type PostType = 'article' | 'update';

/** Mirrors the `posts` table. */
export interface Post {
  id: string;
  type: PostType;
  title: string;
  slug: string;
  excerpt: string;
  body_md: string;
  category: Category;
  tags: string[];
  cover_path: string | null;
  cover_alt: string | null;
  link_url: string | null;
  event_date: string | null;
  featured: boolean;
  status: PostStatus;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  /** Listed on /news. Off for ticker-only items and gallery-only moments. */
  show_in_news: boolean;
  /** Rolls in the "now" ticker at the top of every page. */
  show_in_ticker: boolean;
  in_gallery: boolean;
  video_url: string | null;
  gallery_paths: string[];
  external_links: ExternalLinkValue[];
}

/** Tag that marks seeded content whose source this.md flags as unconfirmed. */
export const TBC_TAG = 'to-be-confirmed';
export const hasTbcFlag = (post: Pick<Post, 'tags'>): boolean => post.tags.includes(TBC_TAG);

export interface PublicListQuery {
  category?: Category;
  tag?: string;
  q?: string;
  type?: PostType;
  /** Restrict to posts listed on the news page. */
  news?: boolean;
  ticker?: boolean;
  gallery?: boolean;
  limit?: number;
  offset?: number;
}

export interface PublicListResult {
  posts: Post[];
  total: number;
}

export interface AdminListQuery {
  q?: string;
  status?: PostStatus | 'scheduled' | 'all';
  category?: Category | 'all';
  type?: PostType | 'all';
  sort?: 'updated' | 'published' | 'title';
}

/** Read side used by the public site. Implementations must apply the visibility rule. */
export interface PublicPostReader {
  list(query?: PublicListQuery): Promise<PublicListResult>;
  getBySlug(slug: string): Promise<Post | null>;
  latestUpdates(limit: number): Promise<Post[]>;
  featured(): Promise<Post | null>;
  allSlugs(): Promise<{ slug: string; updated_at: string }[]>;
  categoriesAndTags(): Promise<{ categories: Category[]; tags: string[] }>;
}
