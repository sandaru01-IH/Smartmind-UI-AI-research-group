import { z } from 'zod';
import { isValidSlug } from './slug';

export const CATEGORIES = [
  'News',
  'Event',
  'Research',
  'Chatbot',
  'Award',
  'Publication',
  'Partnership',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const UPDATE_HEADLINE_MAX = 140;
export const TITLE_MAX = 160;
export const BODY_MAX = 50_000;

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Use a full http or https link');

const optionalUrl = z
  .union([httpUrl, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
  }, 'Not a real date');

const optionalDate = z
  .union([isoDate, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Not a valid date and time')
  .transform((v) => new Date(v).toISOString());

const optionalDateTime = z
  .union([isoDateTime, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(8, 'Use at most 8 tags')
  .transform((list) => Array.from(new Set(list)));

const slug = z.string().refine(isValidSlug, 'Lowercase letters, numbers and single hyphens only');

export const postInputSchema = z
  .object({
    type: z.enum(['article', 'update']),
    title: z.string().trim().min(3, 'Add a title').max(TITLE_MAX),
    slug,
    excerpt: z.string().trim().max(300).default(''),
    body_md: z.string().max(BODY_MAX).default(''),
    category: z.enum(CATEGORIES),
    tags: tags.default([]),
    cover_path: z
      .string()
      .trim()
      .max(300)
      .nullish()
      .transform((v) => v || null),
    cover_alt: z
      .string()
      .trim()
      .max(200)
      .nullish()
      .transform((v) => v || null),
    link_url: optionalUrl,
    event_date: optionalDate,
    featured: z.boolean().default(false),
    status: z.enum(['draft', 'published']).default('draft'),
    published_at: optionalDateTime,
  })
  .superRefine((v, ctx) => {
    if (v.type === 'update' && v.title.length > UPDATE_HEADLINE_MAX) {
      ctx.addIssue({
        code: 'custom',
        path: ['title'],
        message: `Updates are limited to ${UPDATE_HEADLINE_MAX} characters`,
      });
    }
    if (v.cover_path && !v.cover_alt) {
      ctx.addIssue({
        code: 'custom',
        path: ['cover_alt'],
        message: 'Describe the image for screen readers',
      });
    }
  });

export type PostInput = z.output<typeof postInputSchema>;

export const quickUpdateSchema = z.object({
  title: z.string().trim().min(3, 'Add a headline').max(UPDATE_HEADLINE_MAX),
  category: z.enum(CATEGORIES).default('News'),
  link_url: optionalUrl,
  cover_path: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => v || null),
  cover_alt: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
});
export type QuickUpdateInput = z.output<typeof quickUpdateSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(256),
});

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
