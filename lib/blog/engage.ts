import { z } from 'zod';

export const COMMENT_MAX = 2000;

export const commentInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write something first')
    .max(COMMENT_MAX, `Keep comments to ${COMMENT_MAX} characters`),
});

/** Who wrote a comment. `null` author means the writer deleted their account. */
export interface CommentAuthor {
  id: string;
  displayName: string;
  photoPath: string | null;
}

export interface BlogComment {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: CommentAuthor | null;
}

/** Columns for reading comments. Names the member columns visitors may read, never `*`. */
export const COMMENT_COLUMNS =
  'id,post_id,body,created_at,author_id,author:member_profiles!author_id(id,display_name,photo_path)';

const commentRow = z.object({
  id: z.string(),
  post_id: z.string(),
  body: z.string(),
  created_at: z.string(),
  author_id: z.string().nullable(),
  author: z
    .object({ id: z.string(), display_name: z.string(), photo_path: z.string().nullable() })
    .nullable(),
});

export const parseComments = (rows: unknown): BlogComment[] =>
  z
    .array(commentRow)
    .parse(rows ?? [])
    .map((r) => ({
      id: r.id,
      postId: r.post_id,
      body: r.body,
      createdAt: r.created_at,
      author: r.author
        ? { id: r.author.id, displayName: r.author.display_name, photoPath: r.author.photo_path }
        : null,
    }));
