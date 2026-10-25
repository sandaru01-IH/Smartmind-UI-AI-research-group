import { z } from 'zod';
import { THEME_STYLES, PUB_KINDS } from './types';
import type {
  Award,
  CollabProject,
  Spotlight,
  Milestone,
  Partner,
  Publication,
  ResearchProject,
  ResearchTheme,
  ResearchTopic,
  WorkLink,
} from './types';

const str = z
  .string()
  .nullable()
  .transform((v) => v ?? '');

const awardRow = z.object({
  id: z.string(),
  year: z.number(),
  when_label: str,
  award: z.string(),
  who: str,
  event: str,
  reason: str,
  tbc: z.boolean(),
  visible: z.boolean(),
  sort_order: z.number(),
});

const publicationRow = z.object({
  id: z.string(),
  kind: z.enum(PUB_KINDS),
  year: z.number(),
  title: z.string(),
  venue: str,
  href: z.string().nullable(),
  authors: str,
  tbc: z.boolean(),
  visible: z.boolean(),
  sort_order: z.number(),
});

const partnerRow = z.object({
  id: z.string(),
  name: z.string(),
  short: str,
  kind: z.enum(['national', 'international']),
  place: str,
  url: z.string().nullable(),
  logo_path: z.string().nullable(),
  visible: z.boolean(),
  sort_order: z.number(),
});

const themeRow = z.object({
  id: z.string(),
  title: z.string(),
  style: z.enum(THEME_STYLES),
  visible: z.boolean(),
  sort_order: z.number(),
});

const projectRow = z.object({
  id: z.string(),
  theme_id: z.string(),
  title: z.string(),
  src_funded: z.boolean(),
  sort_order: z.number(),
});

const topicRow = z.object({ id: z.string(), title: z.string(), sort_order: z.number() });

const workLinkRow = z.object({
  member_id: z.string(),
  post_id: z.string().nullable(),
  publication_id: z.string().nullable(),
  award_id: z.string().nullable(),
});

export const parseAwardRows = (rows: unknown): Award[] =>
  z
    .array(awardRow)
    .parse(rows ?? [])
    .map((r) => ({ ...r, href: null, people: [] }));

export const parsePublicationRows = (rows: unknown): Publication[] =>
  z
    .array(publicationRow)
    .parse(rows ?? [])
    .map((r) => ({ ...r, fromPost: false, people: [] }));

export const parsePartnerRows = (rows: unknown): Partner[] => z.array(partnerRow).parse(rows ?? []);

export const parseThemeRows = (themes: unknown, projects: unknown): ResearchTheme[] => {
  const ps: ResearchProject[] = z.array(projectRow).parse(projects ?? []);
  return z
    .array(themeRow)
    .parse(themes ?? [])
    .map((t) => ({
      ...t,
      projects: ps.filter((p) => p.theme_id === t.id).sort((a, b) => a.sort_order - b.sort_order),
    }));
};

export const parseTopicRows = (rows: unknown): ResearchTopic[] =>
  z.array(topicRow).parse(rows ?? []);

export const parseWorkLinkRows = (rows: unknown): WorkLink[] =>
  z.array(workLinkRow).parse(rows ?? []);

const milestoneRow = z.object({
  id: z.string(),
  year: z.string(),
  when_label: str,
  title: z.string(),
  detail: str,
  links: z
    .array(z.object({ label: z.string(), href: z.string() }))
    .nullish()
    .transform((v) => v ?? []),
  tbc: z.boolean(),
  post_id: z.string().nullable(),
  visible: z.boolean(),
  sort_order: z.number(),
  // Present on the public read only: the linked post, when the visitor is allowed to see it.
  post: z
    .object({ tbc: z.boolean() })
    .nullish()
    .transform((v) => v ?? null),
});

export const parseMilestoneRows = (rows: unknown): Milestone[] =>
  z
    .array(milestoneRow)
    .parse(rows ?? [])
    .map(({ post, tbc, ...m }) => ({ ...m, own_tbc: tbc, tbc: post ? post.tbc : tbc }));

const spotlightRow = z.object({
  id: z.string(),
  title: z.string(),
  label: str,
  summary: str,
  points: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  note: str,
  tbc: z.boolean(),
  visible: z.boolean(),
  sort_order: z.number(),
});

export const parseSpotlightRows = (rows: unknown): Spotlight[] =>
  z.array(spotlightRow).parse(rows ?? []);

const collabRow = z.object({
  id: z.string(),
  title: z.string(),
  summary: str,
  contact_name: str,
  contact_role: str,
  contact_bio: str,
  contact_email: str,
  contact_photo_path: z.string().nullable(),
  visible: z.boolean(),
  sort_order: z.number(),
});

export const parseCollabRows = (rows: unknown): CollabProject[] =>
  z.array(collabRow).parse(rows ?? []);
