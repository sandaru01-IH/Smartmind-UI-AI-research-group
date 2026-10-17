import { z } from 'zod';
import { isValidSlug } from '@/lib/slug';
import { SOCIAL_PLATFORMS } from './socials';

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

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const teamMemberSchema = z.object({
  slug: z.string().refine(isValidSlug, 'Lowercase letters, numbers and single hyphens only'),
  name: z.string().trim().min(2, 'Add a name').max(120),
  role: text(160),
  group_label: text(40),
  affiliation: text(160),
  education: text(400),
  qualifications: text(400),
  papers: z
    .number()
    .int('Whole number')
    .min(0)
    .max(2000)
    .nullish()
    .transform((v) => v ?? null),
  contribution: text(800),
  photo_path: optionalText(300),
  photo_alt: optionalText(200),
  profile_url: optionalHttp,
  socials: z
    .array(
      z.object({
        platform: z.enum(SOCIAL_PLATFORMS),
        url: z
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
          }, 'Use a full http or https link'),
      }),
    )
    .max(8, 'Use at most 8 profile links')
    .default([]),
  visible: z.boolean().default(true),
  sort_order: z.number().int().min(-1000).max(1000).default(0),
});
export type TeamMemberInput = z.output<typeof teamMemberSchema>;

export const teamLinkSchema = z
  .object({
    a: z.uuid(),
    b: z.uuid(),
    label: z.string().trim().max(80).default(''),
  })
  .refine((v) => v.a !== v.b, { message: 'Pick two different people', path: ['b'] });
export type TeamLinkInput = z.output<typeof teamLinkSchema>;
