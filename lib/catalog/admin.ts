import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicState } from '@/lib/visibility';
import type { Post } from '@/lib/posts/types';
import {
  parseCollabRows,
  parseFeaturedRows,
  parseAwardRows,
  parseMilestoneRows,
  parseSpotlightRows,
  parsePartnerRows,
  parsePublicationRows,
  parseThemeRows,
  parseTopicRows,
  parseWorkLinkRows,
} from './rows';
import type {
  CollabInput,
  FeaturedInput,
  AwardInput,
  MilestoneInput,
  PartnerInput,
  SpotlightInput,
  PublicationInput,
  ThemeInput,
} from './schema';
import {
  COLLAB_COLUMNS,
  FEATURED_COLUMNS,
  AWARD_COLUMNS,
  MILESTONE_COLUMNS,
  PARTNER_COLUMNS,
  PROJECT_COLUMNS,
  SPOTLIGHT_COLUMNS,
  PUBLICATION_COLUMNS,
  THEME_COLUMNS,
  TOPIC_COLUMNS,
  WORK_LINK_COLUMNS,
  type Award,
  type CollabProject,
  type FeaturedItem,
  type Milestone,
  type Partner,
  type Publication,
  type ResearchData,
  type ResearchTheme,
  type Spotlight,
  type WorkKind,
  type WorkLink,
} from './types';

/** Admin data access for the editable site content. Callers pass the session client from requireAdmin(). */

const load = (what: string, error: { message: string } | null): void => {
  if (error) throw new Error(`Could not load ${what}: ${error.message}`);
};

export async function adminAwards(db: SupabaseClient): Promise<Award[]> {
  const { data, error } = await db
    .from('awards')
    .select(AWARD_COLUMNS)
    .order('year', { ascending: false })
    .order('sort_order');
  load('awards', error);
  return parseAwardRows(data);
}

export async function adminPublications(db: SupabaseClient): Promise<Publication[]> {
  const { data, error } = await db
    .from('publications')
    .select(PUBLICATION_COLUMNS)
    .order('year', { ascending: false })
    .order('sort_order');
  load('publications', error);
  return parsePublicationRows(data);
}

export async function adminFeatured(db: SupabaseClient): Promise<FeaturedItem[]> {
  const { data, error } = await db
    .from('featured_research')
    .select(FEATURED_COLUMNS)
    .order('sort_order')
    .order('year', { ascending: false });
  load('featured research', error);
  return parseFeaturedRows(data);
}

export async function adminCollabs(db: SupabaseClient): Promise<CollabProject[]> {
  const { data, error } = await db
    .from('collab_projects')
    .select(COLLAB_COLUMNS)
    .order('sort_order');
  load('collaboration projects', error);
  return parseCollabRows(data);
}

export async function adminPartners(db: SupabaseClient): Promise<Partner[]> {
  const { data, error } = await db
    .from('partners')
    .select(PARTNER_COLUMNS)
    .order('sort_order')
    .order('name');
  load('partners', error);
  return parsePartnerRows(data);
}

export async function adminResearch(db: SupabaseClient): Promise<ResearchData> {
  const [t, p, topics] = await Promise.all([
    db.from('research_themes').select(THEME_COLUMNS).order('sort_order'),
    db.from('research_projects').select(PROJECT_COLUMNS).order('sort_order'),
    db.from('research_topics').select(TOPIC_COLUMNS).order('sort_order'),
  ]);
  load('research', t.error);
  load('projects', p.error);
  load('topics', topics.error);
  return { themes: parseThemeRows(t.data, p.data), topics: parseTopicRows(topics.data) };
}

export async function adminMilestones(db: SupabaseClient): Promise<Milestone[]> {
  const { data, error } = await db.from('milestones').select(MILESTONE_COLUMNS).order('sort_order');
  load('the journey', error);
  return parseMilestoneRows(data);
}

export async function adminSpotlights(db: SupabaseClient): Promise<Spotlight[]> {
  const { data, error } = await db
    .from('research_spotlights')
    .select(SPOTLIGHT_COLUMNS)
    .order('sort_order');
  load('spotlights', error);
  return parseSpotlightRows(data);
}

export async function adminWorkLinks(db: SupabaseClient): Promise<WorkLink[]> {
  const { data, error } = await db.from('work_people').select(WORK_LINK_COLUMNS).limit(5000);
  load('links', error);
  return parseWorkLinkRows(data);
}

/** The people linked to one piece of work. */
export async function adminWorkPeople(
  db: SupabaseClient,
  kind: WorkKind,
  id: string,
): Promise<string[]> {
  const { data, error } = await db.from('work_people').select('member_id').eq(COLUMN[kind], id);
  load('links', error);
  return (data ?? []).map((r: { member_id: string }) => r.member_id);
}

const COLUMN = {
  post: 'post_id',
  publication: 'publication_id',
  award: 'award_id',
} as const satisfies Record<WorkKind, string>;

/** Make the linked people for one piece of work exactly `memberIds`: add the new, remove the gone. */
export async function setWorkPeople(
  db: SupabaseClient,
  kind: WorkKind,
  id: string,
  memberIds: string[],
): Promise<void> {
  const col = COLUMN[kind];
  const wanted = new Set(memberIds);
  const { data, error } = await db.from('work_people').select('id,member_id').eq(col, id);
  if (error) throw new Error(error.message);
  const have = new Map(
    (data ?? []).map((r: { id: string; member_id: string }) => [r.member_id, r.id]),
  );
  const drop = [...have].filter(([m]) => !wanted.has(m)).map(([, rowId]) => rowId);
  const add = [...wanted]
    .filter((m) => !have.has(m))
    .map((member_id) => ({ member_id, [col]: id }));
  if (drop.length) {
    const r = await db.from('work_people').delete().in('id', drop);
    if (r.error) throw new Error(r.error.message);
  }
  if (add.length) {
    const r = await db.from('work_people').insert(add);
    if (r.error) throw new Error(r.error.message);
  }
}

/* ----------------------------------------------------------- row writers */

async function upsertOne<T>(
  db: SupabaseClient,
  table: string,
  columns: string,
  id: string | null,
  values: object,
  parse: (rows: unknown) => T[],
): Promise<T> {
  const q = id ? db.from(table).update(values).eq('id', id) : db.from(table).insert(values);
  const { data, error } = await q.select(columns).single();
  if (error) throw new Error(error.message);
  return parse([data])[0];
}

export const saveAward = (db: SupabaseClient, id: string | null, v: AwardInput) =>
  upsertOne(db, 'awards', AWARD_COLUMNS, id, v, parseAwardRows);
export const savePublication = (db: SupabaseClient, id: string | null, v: PublicationInput) =>
  upsertOne(db, 'publications', PUBLICATION_COLUMNS, id, v, parsePublicationRows);
export const saveMilestone = (db: SupabaseClient, id: string | null, v: MilestoneInput) =>
  upsertOne(db, 'milestones', MILESTONE_COLUMNS, id, v, parseMilestoneRows);
export const saveSpotlight = (db: SupabaseClient, id: string | null, v: SpotlightInput) =>
  upsertOne(db, 'research_spotlights', SPOTLIGHT_COLUMNS, id, v, parseSpotlightRows);
export const savePartner = (db: SupabaseClient, id: string | null, v: PartnerInput) =>
  upsertOne(db, 'partners', PARTNER_COLUMNS, id, v, parsePartnerRows);

export const saveFeatured = (db: SupabaseClient, id: string | null, v: FeaturedInput) =>
  upsertOne(db, 'featured_research', FEATURED_COLUMNS, id, v, parseFeaturedRows);
export const saveCollab = (db: SupabaseClient, id: string | null, v: CollabInput) =>
  upsertOne(db, 'collab_projects', COLLAB_COLUMNS, id, v, parseCollabRows);

export async function deleteRow(
  db: SupabaseClient,
  table:
    | 'awards'
    | 'publications'
    | 'partners'
    | 'research_themes'
    | 'milestones'
    | 'research_spotlights'
    | 'featured_research'
    | 'collab_projects',
  id: string,
): Promise<void> {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Saves a theme and replaces its project list, in the order given. */
export async function saveTheme(
  db: SupabaseClient,
  id: string | null,
  v: ThemeInput,
): Promise<ResearchTheme> {
  const { projects, ...theme } = v;
  const { data, error } = await (
    id
      ? db.from('research_themes').update(theme).eq('id', id)
      : db.from('research_themes').insert(theme)
  )
    .select(THEME_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const themeId = (data as { id: string }).id;
  const del = await db.from('research_projects').delete().eq('theme_id', themeId);
  if (del.error) throw new Error(del.error.message);
  if (projects.length) {
    const ins = await db
      .from('research_projects')
      .insert(projects.map((p, i) => ({ ...p, theme_id: themeId, sort_order: i })));
    if (ins.error) throw new Error(ins.error.message);
  }
  const fresh = await db
    .from('research_projects')
    .select(PROJECT_COLUMNS)
    .eq('theme_id', themeId)
    .order('sort_order');
  if (fresh.error) throw new Error(fresh.error.message);
  return parseThemeRows([data], fresh.data)[0];
}

/** Replaces the whole "wider topics" list. */
export async function saveTopics(db: SupabaseClient, topics: string[]): Promise<void> {
  const del = await db
    .from('research_topics')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (del.error) throw new Error(del.error.message);
  if (topics.length) {
    const ins = await db
      .from('research_topics')
      .insert(topics.map((title, sort_order) => ({ title, sort_order })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

/** A post that also feeds the awards or publications page (ticked "Where it appears" in its editor). */
export interface PostWork {
  id: string;
  title: string;
  category: string;
  year: number;
  state: 'draft' | 'scheduled' | 'live';
  tbc: boolean;
}

/**
 * The posts behind the public Awards and Publications lists, taken from the one list the dashboard
 * already loads. The public pages show these together with the rows kept in the awards and
 * publications tables, so the admin has to as well.
 */
export function postsFeeding(
  posts: readonly Post[],
  flag: 'in_awards' | 'in_publications',
  now: Date = new Date(),
): PostWork[] {
  return posts
    .filter((p) => p[flag])
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      year: new Date(p.event_date ?? p.published_at ?? p.updated_at).getUTCFullYear(),
      state: publicState(p, now),
      tbc: p.tbc,
    }))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}
