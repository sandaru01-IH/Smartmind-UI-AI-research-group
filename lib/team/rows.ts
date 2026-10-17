import { z } from 'zod';
import { SOCIAL_PLATFORMS } from './socials';
import type { TeamLink, TeamMember } from './types';

const str = z
  .string()
  .nullable()
  .transform((v) => v ?? '');

const memberRow = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  role: str,
  group_label: str,
  affiliation: str,
  education: str,
  qualifications: str,
  papers: z.number().nullable(),
  contribution: str,
  photo_path: z.string().nullable(),
  photo_alt: z.string().nullable(),
  profile_url: z.string().nullable(),
  socials: z
    .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: z.string() }))
    .nullish()
    .transform((v) => v ?? []),
  visible: z.boolean(),
  sort_order: z.number(),
});
const linkRow = z.object({ id: z.string(), a: z.string(), b: z.string(), label: str });

export const parseMemberRows = (rows: unknown): TeamMember[] =>
  z
    .array(memberRow)
    .parse(rows ?? [])
    .map((m) => ({ ...m, works: [] }));
export const parseLinkRows = (rows: unknown): TeamLink[] => z.array(linkRow).parse(rows ?? []);
