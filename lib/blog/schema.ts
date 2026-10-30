import { z } from 'zod';

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

/** What a writer sends when saving a post. Publishing is a separate flag on the action. */
export const blogPostInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Add a title of at least 3 characters').max(160),
    summary: z.string().trim().max(300, 'Keep the summary to 300 characters').default(''),
    body_md: z.string().max(50_000, 'This post is too long').default(''),
    cover_path: nullableText(300),
    cover_alt: nullableText(200),
  })
  .refine((v) => !v.cover_path || Boolean(v.cover_alt), {
    message: 'Describe the cover image for screen readers',
    path: ['cover_alt'],
  });
export type BlogPostInput = z.output<typeof blogPostInputSchema>;

export const memberProfileSchema = z.object({
  display_name: z.string().trim().min(2, 'Use at least 2 characters').max(80),
  bio: z.string().trim().max(500, 'Keep the bio to 500 characters').default(''),
  photo_path: nullableText(300).optional(),
});
export type MemberProfileInput = z.output<typeof memberProfileSchema>;
