'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  adminAwards,
  adminMilestones,
  adminPartners,
  adminSpotlights,
  adminPublications,
  adminResearch,
  deleteRow,
  saveAward,
  saveMilestone,
  savePartner,
  saveSpotlight,
  savePublication,
  saveTheme,
  saveTopics,
  setWorkPeople,
} from '@/lib/catalog/admin';
import {
  awardSchema,
  milestoneSchema,
  partnerSchema,
  spotlightSchema,
  publicationSchema,
  themeSchema,
  topicsSchema,
  workPeopleSchema,
} from '@/lib/catalog/schema';
import {
  MILESTONE_POST_SLUG,
  seedAwards,
  seedMilestones,
  seedPartners,
  seedPublications,
  seedResearch,
  seedSpotlights,
} from '@/lib/catalog/seed';
import type {
  Award,
  Milestone,
  Partner,
  Publication,
  ResearchTheme,
  Spotlight,
} from '@/lib/catalog/types';
import { isValidUploadPath } from '@/lib/upload-path';
import type { ActionResult } from './actions';

/**
 * Every write here expires the cache tag of what changed, plus the tags of everything that is built
 * from it (a person's profile, the home page figures), so one edit shows up all over the site.
 */
type Area = 'awards' | 'publications' | 'partners' | 'research' | 'milestones';

const PAGES: Record<Area, string[]> = {
  awards: ['/awards', '/team', '/'],
  publications: ['/publications', '/team', '/'],
  partners: ['/gallery', '/'],
  research: ['/research', '/'],
  milestones: ['/research', '/'],
};

function refresh(area: Area): void {
  updateTag(area);
  if (area === 'awards' || area === 'publications') updateTag('works');
  for (const p of PAGES[area]) revalidatePath(p);
}

const fail = (message: string, fieldErrors?: Record<string, string[]>) =>
  ({ ok: false, message, fieldErrors }) as const;
const invalid = (e: z.ZodError) =>
  fail('Fix the highlighted fields.', z.flattenError(e).fieldErrors as Record<string, string[]>);
const idOrNull = z.uuid().nullable();
const messageOf = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/* ------------------------------------------------------------------ awards */

export async function saveAwardAction(input: {
  id: string | null;
  values: unknown;
  people: unknown;
}): Promise<ActionResult<Award>> {
  const { supabase } = await requireAdmin();
  const id = idOrNull.safeParse(input.id);
  const parsed = awardSchema.safeParse(input.values);
  const people = workPeopleSchema.shape.people.safeParse(input.people);
  if (!id.success) return fail('Unknown award.');
  if (!parsed.success) return invalid(parsed.error);
  if (!people.success) return fail('Check the linked people.');
  try {
    const saved = await saveAward(supabase, id.data, parsed.data);
    await setWorkPeople(supabase, 'award', saved.id, people.data);
    refresh('awards');
    return { ok: true, data: saved };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the award.'));
  }
}

export async function deleteAwardAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown award.');
  try {
    await deleteRow(supabase, 'awards', id);
    refresh('awards');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not delete the award.'));
  }
}

/* ------------------------------------------------------------ publications */

export async function savePublicationAction(input: {
  id: string | null;
  values: unknown;
  people: unknown;
}): Promise<ActionResult<Publication>> {
  const { supabase } = await requireAdmin();
  const id = idOrNull.safeParse(input.id);
  const parsed = publicationSchema.safeParse(input.values);
  const people = workPeopleSchema.shape.people.safeParse(input.people);
  if (!id.success) return fail('Unknown publication.');
  if (!parsed.success) return invalid(parsed.error);
  if (!people.success) return fail('Check the linked people.');
  try {
    const saved = await savePublication(supabase, id.data, parsed.data);
    await setWorkPeople(supabase, 'publication', saved.id, people.data);
    refresh('publications');
    return { ok: true, data: saved };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the publication.'));
  }
}

export async function deletePublicationAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown publication.');
  try {
    await deleteRow(supabase, 'publications', id);
    refresh('publications');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not delete the publication.'));
  }
}

/* ---------------------------------------------------------------- partners */

export async function savePartnerAction(input: {
  id: string | null;
  values: unknown;
}): Promise<ActionResult<Partner>> {
  const { supabase } = await requireAdmin();
  const id = idOrNull.safeParse(input.id);
  const parsed = partnerSchema.safeParse(input.values);
  if (!id.success) return fail('Unknown partner.');
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.logo_path && !isValidUploadPath(parsed.data.logo_path))
    return fail('The logo upload is not valid.', { logo_path: ['Upload the logo again'] });
  try {
    const saved = await savePartner(supabase, id.data, parsed.data);
    refresh('partners');
    return { ok: true, data: saved };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the partner.'));
  }
}

export async function deletePartnerAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown partner.');
  try {
    await deleteRow(supabase, 'partners', id);
    refresh('partners');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not delete the partner.'));
  }
}

/* ---------------------------------------------------------------- research */

export async function saveThemeAction(input: {
  id: string | null;
  values: unknown;
}): Promise<ActionResult<ResearchTheme>> {
  const { supabase } = await requireAdmin();
  const id = idOrNull.safeParse(input.id);
  const parsed = themeSchema.safeParse(input.values);
  if (!id.success) return fail('Unknown theme.');
  if (!parsed.success) return invalid(parsed.error);
  try {
    const saved = await saveTheme(supabase, id.data, parsed.data);
    refresh('research');
    return { ok: true, data: saved };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the theme.'));
  }
}

export async function deleteThemeAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown theme.');
  try {
    await deleteRow(supabase, 'research_themes', id);
    refresh('research');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not delete the theme.'));
  }
}

export async function saveTopicsAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = topicsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await saveTopics(supabase, parsed.data.topics);
    refresh('research');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the topics.'));
  }
}

export async function saveSpotlightAction(input: {
  id: string | null;
  values: unknown;
}): Promise<ActionResult<Spotlight>> {
  const { supabase } = await requireAdmin();
  const id = idOrNull.safeParse(input.id);
  const parsed = spotlightSchema.safeParse(input.values);
  if (!id.success) return fail('Unknown project.');
  if (!parsed.success) return invalid(parsed.error);
  try {
    const saved = await saveSpotlight(supabase, id.data, parsed.data);
    refresh('research');
    return { ok: true, data: saved };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the project.'));
  }
}

export async function deleteSpotlightAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown project.');
  try {
    await deleteRow(supabase, 'research_spotlights', id);
    refresh('research');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not delete the project.'));
  }
}

/* ----------------------------------------------------------------- journey */

export async function saveMilestoneAction(input: {
  id: string | null;
  values: unknown;
}): Promise<ActionResult<Milestone>> {
  const { supabase } = await requireAdmin();
  const id = idOrNull.safeParse(input.id);
  const parsed = milestoneSchema.safeParse(input.values);
  if (!id.success) return fail('Unknown entry.');
  if (!parsed.success) return invalid(parsed.error);
  try {
    // An entry tied to a post shares the post's "to be confirmed" switch, so ticking it here sets the
    // post's switch too (the database copies it back to every entry tied to that post).
    if (parsed.data.post_id) {
      const t = await supabase
        .from('posts')
        .update({ tbc: parsed.data.tbc })
        .eq('id', parsed.data.post_id)
        .select('slug');
      if (t.error) throw new Error(t.error.message);
      updateTag('posts');
      for (const row of t.data ?? []) updateTag(`post:${(row as { slug: string }).slug}`);
      for (const page of ['/news', '/awards', '/publications']) revalidatePath(page);
    }
    const saved = await saveMilestone(supabase, id.data, parsed.data);
    refresh('milestones');
    return { ok: true, data: saved };
  } catch (e) {
    return fail(messageOf(e, 'Could not save the entry.'));
  }
}

export async function deleteMilestoneAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown entry.');
  try {
    await deleteRow(supabase, 'milestones', id);
    refresh('milestones');
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not delete the entry.'));
  }
}

/* ------------------------------------------------------------------- people */

/** Link people to a post, publication or award from its own page. */
export async function setWorkPeopleAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = workPeopleSchema.safeParse(input);
  if (!parsed.success) return fail('Check the linked people.');
  try {
    await setWorkPeople(supabase, parsed.data.kind, parsed.data.id, parsed.data.people);
    updateTag('works');
    updateTag('team');
    for (const p of ['/team', '/awards', '/publications']) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    return fail(messageOf(e, 'Could not link the people.'));
  }
}

/* ------------------------------------------------------------------- import */

/**
 * One-time helper: loads the sourced starter content (the awards, papers, partners and research themes
 * that used to be fixed in code) into any table that is still empty. Existing rows are never touched.
 */
export async function importStarterContentAction(): Promise<ActionResult<{ added: string[] }>> {
  const { supabase } = await requireAdmin();
  try {
    const [awards, pubs, partners, research, journey] = await Promise.all([
      adminAwards(supabase),
      adminPublications(supabase),
      adminPartners(supabase),
      adminResearch(supabase),
      adminMilestones(supabase),
    ]);
    const added: string[] = [];
    if (awards.length === 0) {
      for (const a of seedAwards()) {
        await saveAward(
          supabase,
          null,
          awardSchema.parse({
            year: a.year,
            when_label: a.when_label,
            award: a.award,
            who: a.who,
            event: a.event,
            reason: a.reason,
            tbc: a.tbc,
            sort_order: a.sort_order,
          }),
        );
      }
      added.push('awards');
    }
    if (pubs.length === 0) {
      for (const p of seedPublications()) {
        await savePublication(
          supabase,
          null,
          publicationSchema.parse({
            kind: p.kind,
            year: p.year,
            title: p.title,
            venue: p.venue,
            href: p.href,
            authors: p.authors,
            tbc: p.tbc,
            sort_order: p.sort_order,
          }),
        );
      }
      added.push('publications');
    }
    if (partners.length === 0) {
      for (const p of seedPartners()) {
        await savePartner(
          supabase,
          null,
          partnerSchema.parse({
            name: p.name,
            short: p.short,
            kind: p.kind,
            place: p.place,
            url: p.url,
            sort_order: p.sort_order,
          }),
        );
      }
      added.push('partners');
    }
    if (research.themes.length === 0) {
      const seed = seedResearch();
      for (const t of seed.themes) {
        await saveTheme(
          supabase,
          null,
          themeSchema.parse({
            title: t.title,
            style: t.style,
            sort_order: t.sort_order,
            projects: t.projects.map((p) => ({ title: p.title, src_funded: p.src_funded })),
          }),
        );
      }
      if (research.topics.length === 0)
        await saveTopics(
          supabase,
          seed.topics.map((x) => x.title),
        );
      added.push('research');
    }
    if ((await adminSpotlights(supabase)).length === 0) {
      for (const s of seedSpotlights()) {
        await saveSpotlight(supabase, null, spotlightSchema.parse(s));
      }
      added.push('spotlights');
    }
    if (journey.length === 0) {
      const slugs = Object.values(MILESTONE_POST_SLUG);
      const found = await supabase.from('posts').select('id,slug').in('slug', slugs);
      const idBySlug = new Map(
        (found.data ?? []).map((p: { id: string; slug: string }) => [p.slug, p.id]),
      );
      for (const m of seedMilestones()) {
        const slug = MILESTONE_POST_SLUG[m.seedId];
        await saveMilestone(
          supabase,
          null,
          milestoneSchema.parse({
            year: m.year,
            when_label: m.when_label,
            title: m.title,
            detail: m.detail,
            links: m.links,
            tbc: m.own_tbc,
            post_id: slug ? (idBySlug.get(slug) ?? null) : null,
            sort_order: m.sort_order,
          }),
        );
      }
      added.push('journey');
    }
    for (const area of ['awards', 'publications', 'partners', 'research', 'milestones'] as const)
      refresh(area);
    return { ok: true, data: { added } };
  } catch (e) {
    return fail(messageOf(e, 'Could not import the starter content.'));
  }
}
