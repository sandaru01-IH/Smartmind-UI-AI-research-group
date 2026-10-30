/** A post as its author sees it, drafts and hidden posts included. */
export interface MyBlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  coverPath: string | null;
  coverAlt: string | null;
  status: 'draft' | 'published';
  publishedAt: string | null;
  /** Hidden by an admin: the author can still see it, the public cannot. */
  hidden: boolean;
  likeCount: number;
  updatedAt: string;
}

export const MY_POST_COLUMNS =
  'id,slug,title,summary,body_md,cover_path,cover_alt,status,published_at,hidden,like_count,updated_at';
