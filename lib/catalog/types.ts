import type { ThemeId } from '@/content/types';

/** Shapes of the editable site content. They mirror the tables in supabase/migrations. */

export const THEME_STYLES = [
  'land',
  'flood',
  'traffic',
  'ai',
] as const satisfies readonly ThemeId[];
export const THEME_STYLE_LABEL: Record<ThemeId, string> = {
  land: 'Blue-green: land blocks',
  flood: 'Blue: flood rings',
  traffic: 'Amber: moving traffic',
  ai: 'Violet: small network',
};

export const PUB_KINDS = ['paper', 'poster', 'report', 'talk', 'other'] as const;
export type PubKind = (typeof PUB_KINDS)[number];
export const PUB_KIND_LABEL: Record<PubKind, string> = {
  paper: 'Paper',
  poster: 'Poster',
  report: 'Report',
  talk: 'Talk',
  other: 'Other',
};

export interface Award {
  id: string;
  year: number;
  when_label: string;
  award: string;
  who: string;
  event: string;
  reason: string;
  tbc: boolean;
  visible: boolean;
  sort_order: number;
  /** Set when the entry comes from a news post ticked "list as an award". */
  href: string | null;
  /** People linked to this award (filled in on the read side). */
  people: PersonRef[];
}

export interface Publication {
  id: string;
  kind: PubKind;
  year: number;
  title: string;
  venue: string;
  href: string | null;
  authors: string;
  tbc: boolean;
  visible: boolean;
  sort_order: number;
  /** True when this entry comes from a news post ticked "list as a publication". */
  fromPost: boolean;
  people: PersonRef[];
}

export interface Partner {
  id: string;
  name: string;
  short: string;
  kind: 'national' | 'international';
  place: string;
  url: string | null;
  logo_path: string | null;
  visible: boolean;
  sort_order: number;
}

export interface ResearchProject {
  id: string;
  theme_id: string;
  title: string;
  src_funded: boolean;
  sort_order: number;
}

export interface ResearchTheme {
  id: string;
  title: string;
  style: ThemeId;
  visible: boolean;
  sort_order: number;
  projects: ResearchProject[];
}

export interface ResearchTopic {
  id: string;
  title: string;
  sort_order: number;
}

export interface ResearchData {
  themes: ResearchTheme[];
  topics: ResearchTopic[];
}

/** A person as named next to a work. */
export interface PersonRef {
  id: string;
  name: string;
  slug: string;
}

/** One row of the people-to-work link table. Exactly one of the three work ids is set. */
export interface WorkLink {
  member_id: string;
  post_id: string | null;
  publication_id: string | null;
  award_id: string | null;
}

export type WorkKind = 'post' | 'publication' | 'award';

/** What a profile shows under "Work". */
export interface MemberWork {
  /** Identifies the work across people, so shared work can connect them. */
  key: string;
  kind: 'article' | 'paper' | 'poster' | 'report' | 'talk' | 'other' | 'award';
  title: string;
  year: number | null;
  href: string | null;
  internal: boolean;
}

export const AWARD_COLUMNS = 'id,year,when_label,award,who,event,reason,tbc,visible,sort_order';
export const PUBLICATION_COLUMNS = 'id,kind,year,title,venue,href,authors,tbc,visible,sort_order';
export const PARTNER_COLUMNS = 'id,name,short,kind,place,url,logo_path,visible,sort_order';
export const THEME_COLUMNS = 'id,title,style,visible,sort_order';
export const PROJECT_COLUMNS = 'id,theme_id,title,src_funded,sort_order';
export const TOPIC_COLUMNS = 'id,title,sort_order';
export const WORK_LINK_COLUMNS = 'member_id,post_id,publication_id,award_id';

/** Theme colour variables from tokens.css, by pattern style. */
export const THEME_VARS: Record<ThemeId, { colourVar: string; inkVar: string }> = {
  land: { colourVar: '--landslide', inkVar: '--landslide-ink' },
  flood: { colourVar: '--flood', inkVar: '--flood-ink' },
  traffic: { colourVar: '--traffic', inkVar: '--traffic-ink' },
  ai: { colourVar: '--ai', inkVar: '--ai-ink' },
};

export interface MilestoneLink {
  label: string;
  href: string;
}

/** One step of the chatbot journey timeline. */
export interface Milestone {
  id: string;
  year: string;
  when_label: string;
  title: string;
  detail: string;
  links: MilestoneLink[];
  /** The entry's own switch. When a post is linked, the post's switch wins (see `tbc`). */
  own_tbc: boolean;
  /** What visitors see: the linked post's switch if there is one, otherwise the entry's own. */
  tbc: boolean;
  post_id: string | null;
  visible: boolean;
  sort_order: number;
}

export const MILESTONE_COLUMNS =
  'id,year,when_label,title,detail,links,tbc,post_id,visible,sort_order';

/** A highlighted project on the research page, such as the 4ONSE weather station. */
export interface Spotlight {
  id: string;
  title: string;
  label: string;
  summary: string;
  points: string[];
  note: string;
  tbc: boolean;
  visible: boolean;
  sort_order: number;
}

export const SPOTLIGHT_COLUMNS = 'id,title,label,summary,points,note,tbc,visible,sort_order';

/** A key paper or project highlighted on the home page and the research page. */
export interface FeaturedItem {
  id: string;
  kind: 'paper' | 'project';
  year: number;
  title: string;
  venue: string;
  summary: string;
  key_partners: string;
  href: string | null;
  figure_path: string | null;
  figure_caption: string;
  tbc: boolean;
  visible: boolean;
  sort_order: number;
}

export const FEATURED_COLUMNS =
  'id,kind,year,title,venue,summary,key_partners,href,figure_path,figure_caption,tbc,visible,sort_order';

/** An ongoing project open to collaboration, with the person to contact. */
export interface CollabProject {
  id: string;
  title: string;
  summary: string;
  contact_name: string;
  contact_role: string;
  contact_bio: string;
  contact_email: string;
  contact_photo_path: string | null;
  visible: boolean;
  sort_order: number;
}

export const COLLAB_COLUMNS =
  'id,title,summary,contact_name,contact_role,contact_bio,contact_email,contact_photo_path,visible,sort_order';
