/** Mirrors the `team_members` table. */
export interface TeamMember {
  id: string;
  slug: string;
  name: string;
  role: string;
  /** Free label the admin chooses, for example "Core", "Collaborator" or "Alumni". Drives the node colour. */
  group_label: string;
  affiliation: string;
  education: string;
  qualifications: string;
  papers: number | null;
  contribution: string;
  photo_path: string | null;
  photo_alt: string | null;
  profile_url: string | null;
  visible: boolean;
  sort_order: number;
}

/** Mirrors `team_links`: one undirected connection between two people. */
export interface TeamLink {
  id: string;
  a: string;
  b: string;
  label: string;
}

export interface TeamNetworkData {
  members: TeamMember[];
  links: TeamLink[];
}

export const TEAM_COLUMNS =
  'id,slug,name,role,group_label,affiliation,education,qualifications,papers,contribution,photo_path,photo_alt,profile_url,visible,sort_order';
export const LINK_COLUMNS = 'id,a,b,label';
