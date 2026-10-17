import { SEED_LINKS, TEAM } from '@/content/team';
import type { TeamLink, TeamMember, TeamNetworkData } from './types';

const GROUP_LABEL = { core: 'Core', authors: 'Authors', collaborator: 'Collaborator' } as const;

/** Demo mode (no Supabase) and the admin import of the starter team: the sourced people and their links. */
export function seedNetwork(): TeamNetworkData {
  const members: TeamMember[] = TEAM.filter((p) => p.confirmation === 'confirmed').map((p, i) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    role: '',
    group_label: GROUP_LABEL[p.group],
    affiliation: p.affiliation ?? '',
    education: '',
    qualifications: '',
    papers: null,
    contribution: p.appears.join('. '),
    photo_path: null,
    photo_alt: null,
    profile_url: null,
    socials: [],
    visible: true,
    sort_order: i,
    works: [],
  }));
  const ids = new Set(members.map((m) => m.id));
  const links: TeamLink[] = SEED_LINKS.filter((l) => ids.has(l.a) && ids.has(l.b)).map((l) => ({
    id: `${l.a}~${l.b}`,
    ...l,
  }));
  return { members, links };
}
