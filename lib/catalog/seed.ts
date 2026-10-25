import { AWARDS } from '@/content/awards';
import { MILESTONES } from '@/content/chatbots';
import { PARTNERS } from '@/content/partners';
import { ALL_PUBLICATIONS } from '@/content/publications';
import { FOURONSE, THEMES, WIDER_TOPICS } from '@/content/research';
import type { Award, Milestone, Partner, Publication, ResearchData, Spotlight } from './types';

/**
 * Demo mode (no Supabase) and the one-off import into a new database: the sourced content that used
 * to be hard-coded. From the first import on, the admin edits the database and these are not read.
 */

export function seedAwards(): Award[] {
  return AWARDS.map((a, i) => ({
    id: a.id,
    year: a.year,
    when_label: a.when,
    award: a.award,
    who: a.who,
    event: a.event,
    reason: a.reason ?? '',
    tbc: a.confirmation === 'tbc',
    visible: true,
    sort_order: i,
    href: null,
    people: [],
  }));
}

export function seedPublications(): Publication[] {
  return ALL_PUBLICATIONS.map((p, i) => ({
    id: p.id,
    kind: 'paper' as const,
    year: p.year,
    title: p.title,
    venue: p.venue,
    href: p.href ?? null,
    authors: p.authors ?? '',
    tbc: p.confirmation === 'tbc',
    visible: true,
    sort_order: i,
    fromPost: false,
    people: [],
  }));
}

export function seedPartners(): Partner[] {
  return PARTNERS.map((p, i) => ({
    id: p.name,
    name: p.name,
    short: p.short,
    kind: p.kind,
    place: p.place ?? '',
    url: p.url ?? null,
    logo_path: null,
    visible: true,
    sort_order: i,
  }));
}

export function seedResearch(): ResearchData {
  return {
    themes: THEMES.map((t, i) => ({
      id: t.id,
      title: t.title,
      style: t.id,
      visible: true,
      sort_order: i,
      projects: t.projects.map((p, j) => ({
        id: `${t.id}-${j}`,
        theme_id: t.id,
        title: p.title,
        src_funded: p.srcFunded,
        sort_order: j,
      })),
    })),
    topics: WIDER_TOPICS.map((title, i) => ({ id: `topic-${i}`, title, sort_order: i })),
  };
}

/** Which news post each starter milestone belongs to, so the post's switch drives the timeline. */
export const MILESTONE_POST_SLUG: Record<string, string> = {
  'nbro-manchester': 'nbro-manchester-landslide-chatbot-meeting',
  'icsd-2025': 'icsd-2025-best-scientific-paper',
  'participatory-2026': 'participatory-chatbot-flood-landslide-resilience',
  'street-cloud-2026': 'street-cloud-ioer-dresden',
};

export function seedMilestones(): (Milestone & { seedId: string })[] {
  return MILESTONES.map((m, i) => ({
    id: m.id,
    seedId: m.id,
    year: m.year,
    when_label: m.when,
    title: m.title,
    detail: m.detail,
    links: m.links ?? [],
    own_tbc: m.confirmation === 'tbc',
    tbc: m.confirmation === 'tbc',
    post_id: null,
    visible: true,
    sort_order: i,
  }));
}

export function seedSpotlights(): Spotlight[] {
  return [
    {
      id: 'fouronse',
      title: FOURONSE.name,
      label: 'Weather station',
      summary: FOURONSE.summary,
      points: FOURONSE.stack,
      note: FOURONSE.partner,
      tbc: FOURONSE.confirmation === 'tbc',
      visible: true,
      sort_order: 0,
    },
  ];
}
