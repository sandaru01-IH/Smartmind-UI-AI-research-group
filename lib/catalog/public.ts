import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NumberStat } from '@/content/numbers';
import { createPublicClient } from '@/lib/supabase/public-client';
import { getMemberRefs } from '@/lib/team/refs';
import {
  parseAwardRows,
  parseMilestoneRows,
  parseSpotlightRows,
  parsePartnerRows,
  parsePublicationRows,
  parseThemeRows,
  parseTopicRows,
  parseWorkLinkRows,
} from './rows';
import {
  seedAwards,
  seedMilestones,
  seedPartners,
  seedPublications,
  seedResearch,
  seedSpotlights,
} from './seed';
import {
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
  type MemberWork,
  type Milestone,
  type Partner,
  type PersonRef,
  type Publication,
  type ResearchData,
  type Spotlight,
  type WorkLink,
} from './types';

/**
 * Public read side for the editable site content. Every reader is cached and tagged; the admin
 * actions expire the tags at once, so an edit shows everywhere that uses it. Demo mode (no
 * Supabase) serves the sourced starter content from content/*.ts.
 *   tags: 'awards' 'publications' 'partners' 'research' 'works' (people-to-work links) 'posts' 'team'
 */

const life = { stale: 60, revalidate: 120, expire: 86400 } as const;

const refMap = (refs: PersonRef[]) => new Map(refs.map((r) => [r.id, r]));

function peopleFor(
  links: WorkLink[],
  refs: Map<string, PersonRef>,
  key: 'post_id' | 'publication_id' | 'award_id',
  id: string,
): PersonRef[] {
  return links
    .filter((l) => l[key] === id)
    .flatMap((l) => {
      const r = refs.get(l.member_id);
      return r ? [r] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Every people-to-work link the public may see (Row Level Security hides links to unpublished work). */
export async function getWorkLinks(): Promise<WorkLink[]> {
  'use cache';
  cacheTag('works');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return [];
  const { data, error } = await db.from('work_people').select(WORK_LINK_COLUMNS).limit(5000);
  if (error) throw new Error(`Could not load links: ${error.message}`);
  return parseWorkLinkRows(data);
}

interface FlaggedPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string | null;
  published_at: string | null;
  event_date: string | null;
  tbc: boolean;
}

async function flaggedPosts(
  db: SupabaseClient,
  flag: 'in_publications' | 'in_awards',
): Promise<FlaggedPost[]> {
  const { data, error } = await db
    .from('posts')
    .select('id,slug,title,category,excerpt,published_at,event_date,tbc')
    .eq('status', 'published')
    .eq(flag, true)
    .order('published_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  return (data ?? []) as FlaggedPost[];
}

const yearOf = (p: FlaggedPost): number =>
  new Date(p.event_date ?? p.published_at ?? Date.now()).getUTCFullYear();

export async function getAwards(): Promise<Award[]> {
  'use cache';
  cacheTag('awards', 'works', 'posts', 'team');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return seedAwards();
  const [a, posts, links, refs] = await Promise.all([
    db
      .from('awards')
      .select(AWARD_COLUMNS)
      .eq('visible', true)
      .order('year', { ascending: false })
      .order('sort_order'),
    flaggedPosts(db, 'in_awards'),
    getWorkLinks(),
    getMemberRefs(),
  ]);
  if (a.error) throw new Error(`Could not load awards: ${a.error.message}`);
  const byId = refMap(refs);
  const rows = parseAwardRows(a.data).map((r) => ({
    ...r,
    people: peopleFor(links, byId, 'award_id', r.id),
  }));
  const fromPosts: Award[] = posts.map((p, i) => {
    const people = peopleFor(links, byId, 'post_id', p.id);
    return {
      id: `post:${p.id}`,
      year: yearOf(p),
      when_label: '',
      award: p.title,
      who: people.map((x) => x.name).join(', '),
      event: '',
      reason: p.excerpt ?? '',
      tbc: p.tbc,
      visible: true,
      sort_order: i,
      href: `/news/${p.slug}`,
      people,
    };
  });
  return [...rows, ...fromPosts].sort((x, y) => y.year - x.year || x.sort_order - y.sort_order);
}

export async function getPublications(): Promise<Publication[]> {
  'use cache';
  cacheTag('publications', 'works', 'posts', 'team');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return seedPublications();
  const [p, posts, links, refs] = await Promise.all([
    db
      .from('publications')
      .select(PUBLICATION_COLUMNS)
      .eq('visible', true)
      .order('year', { ascending: false })
      .order('sort_order'),
    flaggedPosts(db, 'in_publications'),
    getWorkLinks(),
    getMemberRefs(),
  ]);
  if (p.error) throw new Error(`Could not load publications: ${p.error.message}`);
  const byId = refMap(refs);
  const rows = parsePublicationRows(p.data).map((r) => {
    const people = peopleFor(links, byId, 'publication_id', r.id);
    return { ...r, people, authors: r.authors || people.map((x) => x.name).join(', ') };
  });
  const fromPosts: Publication[] = posts.map((x, i) => {
    const people = peopleFor(links, byId, 'post_id', x.id);
    return {
      id: `post:${x.id}`,
      kind: 'other',
      year: yearOf(x),
      title: x.title,
      venue: x.category,
      href: `/news/${x.slug}`,
      authors: people.map((m) => m.name).join(', '),
      tbc: x.tbc,
      visible: true,
      sort_order: i,
      fromPost: true,
      people,
    };
  });
  return [...rows, ...fromPosts].sort((a, b) => b.year - a.year || a.sort_order - b.sort_order);
}

export async function getPartners(): Promise<Partner[]> {
  'use cache';
  cacheTag('partners');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return seedPartners();
  const { data, error } = await db
    .from('partners')
    .select(PARTNER_COLUMNS)
    .eq('visible', true)
    .order('sort_order')
    .order('name');
  if (error) throw new Error(`Could not load partners: ${error.message}`);
  return parsePartnerRows(data);
}

export async function getResearch(): Promise<ResearchData> {
  'use cache';
  cacheTag('research');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return seedResearch();
  const [t, p, topics] = await Promise.all([
    db.from('research_themes').select(THEME_COLUMNS).eq('visible', true).order('sort_order'),
    db.from('research_projects').select(PROJECT_COLUMNS).order('sort_order'),
    db.from('research_topics').select(TOPIC_COLUMNS).order('sort_order'),
  ]);
  if (t.error) throw new Error(`Could not load research: ${t.error.message}`);
  if (p.error) throw new Error(`Could not load projects: ${p.error.message}`);
  if (topics.error) throw new Error(`Could not load topics: ${topics.error.message}`);
  return { themes: parseThemeRows(t.data, p.data), topics: parseTopicRows(topics.data) };
}

export async function getSpotlights(): Promise<Spotlight[]> {
  'use cache';
  cacheTag('research');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return seedSpotlights();
  const { data, error } = await db
    .from('research_spotlights')
    .select(SPOTLIGHT_COLUMNS)
    .eq('visible', true)
    .order('sort_order');
  if (error) throw new Error(`Could not load spotlights: ${error.message}`);
  return parseSpotlightRows(data);
}

/**
 * The chatbot journey. An entry tied to a news post follows that post's "to be confirmed" switch, so
 * confirming the post confirms the timeline too (and everywhere else the post is shown).
 */
export async function getMilestones(): Promise<Milestone[]> {
  'use cache';
  cacheTag('milestones', 'posts');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return seedMilestones();
  const { data, error } = await db
    .from('milestones')
    .select(`${MILESTONE_COLUMNS},post:posts(tbc)`)
    .eq('visible', true)
    .order('sort_order');
  if (error) throw new Error(`Could not load the journey: ${error.message}`);
  return parseMilestoneRows(data);
}

/** Everything each person has been part of, newest first. Fills the profile on its own as work is added. */
export async function getMemberWorks(): Promise<Record<string, MemberWork[]>> {
  'use cache';
  cacheTag('works', 'awards', 'publications', 'posts');
  cacheLife(life);
  const db = createPublicClient();
  if (!db) return {};
  const links = await getWorkLinks();
  if (links.length === 0) return {};
  const ids = (key: 'post_id' | 'publication_id' | 'award_id') =>
    Array.from(new Set(links.flatMap((l) => (l[key] ? [l[key] as string] : []))));
  const none = { data: [], error: null };
  const [posts, pubs, awards] = await Promise.all([
    ids('post_id').length
      ? db
          .from('posts')
          .select('id,slug,title,published_at,event_date,in_awards,in_publications')
          .in('id', ids('post_id'))
          .eq('status', 'published')
      : Promise.resolve(none),
    ids('publication_id').length
      ? db
          .from('publications')
          .select('id,kind,title,year,href')
          .in('id', ids('publication_id'))
          .eq('visible', true)
      : Promise.resolve(none),
    ids('award_id').length
      ? db.from('awards').select('id,award,year').in('id', ids('award_id')).eq('visible', true)
      : Promise.resolve(none),
  ]);
  for (const r of [posts, pubs, awards])
    if (r.error) throw new Error(`Could not load works: ${r.error.message}`);

  type Row = Record<string, unknown>;
  const postById = new Map(((posts.data ?? []) as Row[]).map((r) => [r.id as string, r]));
  const pubById = new Map(((pubs.data ?? []) as Row[]).map((r) => [r.id as string, r]));
  const awardById = new Map(((awards.data ?? []) as Row[]).map((r) => [r.id as string, r]));

  const out: Record<string, MemberWork[]> = {};
  for (const l of links) {
    let work: MemberWork | null = null;
    if (l.post_id) {
      const r = postById.get(l.post_id);
      if (r) {
        const at = (r.event_date ?? r.published_at) as string | null;
        work = {
          key: `post:${l.post_id}`,
          kind: r.in_awards ? 'award' : r.in_publications ? 'paper' : 'article',
          title: r.title as string,
          year: at ? new Date(at).getUTCFullYear() : null,
          href: `/news/${r.slug as string}`,
          internal: true,
        };
      }
    } else if (l.publication_id) {
      const r = pubById.get(l.publication_id);
      if (r)
        work = {
          key: `publication:${l.publication_id}`,
          kind: r.kind as MemberWork['kind'],
          title: r.title as string,
          year: r.year as number,
          href: (r.href as string | null) ?? null,
          internal: false,
        };
    } else if (l.award_id) {
      const r = awardById.get(l.award_id);
      if (r)
        work = {
          key: `award:${l.award_id}`,
          kind: 'award',
          title: r.award as string,
          year: r.year as number,
          href: null,
          internal: false,
        };
    }
    if (work) (out[l.member_id] ??= []).push(work);
  }
  for (const list of Object.values(out)) list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return out;
}

/**
 * The home page figures. Every number is counted from the live content, so none can go stale. They count
 * everything the matching page lists, including entries still flagged "to be confirmed", so a figure
 * always equals what the visitor finds when they click through.
 */
export async function getNumberStats(teamCount: number): Promise<NumberStat[]> {
  const [pubs, awards, partners, research] = await Promise.all([
    getPublications(),
    getAwards(),
    getPartners(),
    getResearch(),
  ]);
  return [
    { id: 'papers', value: pubs.length, label: 'Publications' },
    { id: 'team', value: teamCount, label: 'People in the network' },
    { id: 'themes', value: research.themes.length, label: 'Research themes' },
    { id: 'awards', value: awards.length, label: 'Awards' },
    { id: 'partners', value: partners.length, label: 'Partners' },
  ];
}
