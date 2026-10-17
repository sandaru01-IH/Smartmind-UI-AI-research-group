import { z } from 'zod';
import { PUB_KINDS, THEME_STYLES } from './types';

const text = (max: number) => z.string().trim().max(max).default('');

const optionalHttp = z
  .string()
  .trim()
  .max(2048)
  .nullish()
  .refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Use a full http or https link')
  .transform((v) => v || null);

const httpUrlStrict = z
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

const year = z.number().int('Whole number').min(1900, 'Use a four digit year').max(2100);
const sortOrder = z.number().int().min(-10000).max(10000).default(0);
const people = z.array(z.uuid()).max(60, 'Link at most 60 people').default([]);

export const awardSchema = z.object({
  year,
  when_label: text(60),
  award: z.string().trim().min(2, 'Add the award name').max(200),
  who: text(200),
  event: text(300),
  reason: text(300),
  tbc: z.boolean().default(false),
  visible: z.boolean().default(true),
  sort_order: sortOrder,
});
export type AwardInput = z.output<typeof awardSchema>;

export const publicationSchema = z.object({
  kind: z.enum(PUB_KINDS).default('paper'),
  year,
  title: z.string().trim().min(3, 'Add a title').max(400),
  venue: text(300),
  href: optionalHttp,
  authors: text(400),
  tbc: z.boolean().default(false),
  visible: z.boolean().default(true),
  sort_order: sortOrder,
});
export type PublicationInput = z.output<typeof publicationSchema>;

export const partnerSchema = z.object({
  name: z.string().trim().min(2, 'Add the name').max(200),
  short: text(24),
  kind: z.enum(['national', 'international']).default('national'),
  place: text(80),
  url: optionalHttp,
  logo_path: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => v || null),
  visible: z.boolean().default(true),
  sort_order: sortOrder,
});
export type PartnerInput = z.output<typeof partnerSchema>;

export const themeSchema = z.object({
  title: z.string().trim().min(2, 'Add a title').max(120),
  style: z.enum(THEME_STYLES).default('land'),
  visible: z.boolean().default(true),
  sort_order: sortOrder,
  projects: z
    .array(
      z.object({
        title: z.string().trim().min(2, 'Name the project').max(300),
        src_funded: z.boolean().default(false),
      }),
    )
    .max(30, 'Use at most 30 projects')
    .default([]),
});
export type ThemeInput = z.output<typeof themeSchema>;

export const topicsSchema = z.object({
  topics: z.array(z.string().trim().min(2).max(200)).max(60, 'Use at most 60 topics'),
});

export const workPeopleSchema = z.object({
  kind: z.enum(['post', 'publication', 'award']),
  id: z.uuid(),
  people,
});
export const peopleIds = people;

export const milestoneSchema = z.object({
  year: z.string().trim().min(1, 'Add a year').max(10),
  when_label: text(80),
  title: z.string().trim().min(2, 'Add a title').max(200),
  detail: text(2000),
  links: z
    .array(
      z.object({ label: z.string().trim().min(1, 'Name the link').max(80), href: httpUrlStrict }),
    )
    .max(6, 'Use at most 6 links')
    .default([]),
  tbc: z.boolean().default(false),
  post_id: z
    .uuid()
    .nullish()
    .transform((v) => v ?? null),
  visible: z.boolean().default(true),
  sort_order: sortOrder,
});
export type MilestoneInput = z.output<typeof milestoneSchema>;

export const spotlightSchema = z.object({
  title: z.string().trim().min(2, 'Add a title').max(120),
  label: text(40),
  summary: text(1000),
  points: z.array(z.string().trim().min(1).max(200)).max(12, 'Use at most 12 points').default([]),
  note: text(1000),
  tbc: z.boolean().default(false),
  visible: z.boolean().default(true),
  sort_order: sortOrder,
});
export type SpotlightInput = z.output<typeof spotlightSchema>;
