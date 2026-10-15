import type { Sourced } from './types';

export interface Person extends Sourced {
  slug: string;
  name: string;
  /** Stated in this.md. Never invented. Becomes the seed "key contribution" text. */
  appears: string[];
  /** Seed group label. In the live site the admin sets it per person. */
  group: 'core' | 'authors' | 'collaborator';
  affiliation?: string;
}

/** Seed connections between people, by slug. Every pair is backed by an `appears` line or the paper it names. */
export const SEED_LINKS: { a: string; b: string; label: string }[] = [
  { a: 'amila-jayasinghe', b: 'chethika-abenayake', label: 'Co-authors of the lab’s papers' },
  { a: 'amila-jayasinghe', b: 'niroshan-sanjaya', label: 'Core team' },
  { a: 'amila-jayasinghe', b: 'sandaruwan-sankalpa-silva', label: 'Core team' },
  { a: 'amila-jayasinghe', b: 'farasath-hasan', label: 'Core team' },
  { a: 'amila-jayasinghe', b: 'lahiru-kaveesha', label: 'Core team' },
  { a: 'amila-jayasinghe', b: 'sahan-sathsarana', label: 'Core team' },
  { a: 'amila-jayasinghe', b: 'malith-deshan', label: 'Core team' },
  { a: 'niroshan-sanjaya', b: 'sandaruwan-sankalpa-silva', label: 'Street Cloud team' },
  { a: 'niroshan-sanjaya', b: 'samith-madusanka', label: 'Street Cloud team' },
  { a: 'sandaruwan-sankalpa-silva', b: 'samith-madusanka', label: 'Street Cloud team' },
  { a: 'amila-jayasinghe', b: 'harini-sawandi', label: '2026 participatory chatbot paper' },
  { a: 'amila-jayasinghe', b: 'sachin-mamoru', label: '2026 participatory chatbot paper' },
  { a: 'harini-sawandi', b: 'sachin-mamoru', label: '2026 participatory chatbot paper' },
  { a: 'harini-sawandi', b: 'choolaka-hewawasam', label: '2026 participatory chatbot paper' },
  { a: 'sachin-mamoru', b: 'jasintha-jayasanka', label: '2026 participatory chatbot paper' },
  { a: 'harini-sawandi', b: 'buddhika-amila-kumara', label: '2026 participatory chatbot paper' },
  { a: 'sachin-mamoru', b: 'pradeep-kalansooriya', label: '2026 participatory chatbot paper' },
  { a: 'choolaka-hewawasam', b: 'jasintha-jayasanka', label: 'University of Sri Jayewardenepura' },
  {
    a: 'jasintha-jayasanka',
    b: 'buddhika-amila-kumara',
    label: 'University of Sri Jayewardenepura',
  },
  {
    a: 'choolaka-hewawasam',
    b: 'buddhika-amila-kumara',
    label: 'University of Sri Jayewardenepura',
  },
];

const CORE = 'Team (table)';
const OTHER = 'Team (table, below the core eight)';
const COLLAB = 'Team (paragraph on collaborators)';

// Source: this.md > "Team". Roles and photos were not published, so only "where they appear" is shown.
export const TEAM: Person[] = [
  {
    slug: 'amila-jayasinghe',
    name: 'Amila Jayasinghe',
    group: 'core',
    affiliation: 'Department of Town & Country Planning',
    appears: [
      'Author of the chatbot article (TheChatbot, January 2024)',
      'Co-author of the 2026 participatory chatbot paper',
    ],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'chethika-abenayake',
    name: 'Chethika Abenayake',
    group: 'core',
    affiliation: 'Department of Town & Country Planning',
    appears: ['Core team (2024 article)', 'Co-author on the lab’s publications'],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'niroshan-sanjaya',
    name: 'Niroshan Sanjaya',
    group: 'core',
    appears: ['Core team (2024 article)', 'Street Cloud team'],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'sandaruwan-sankalpa-silva',
    name: 'Sandaruwan Sankalpa (Silva)',
    group: 'core',
    appears: ['Core team (2024 article)', 'Presented Street Cloud in Dresden'],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'farasath-hasan',
    name: 'Farasath Hasan',
    group: 'core',
    appears: ['Core team (2024 article)'],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'lahiru-kaveesha',
    name: 'Lahiru Kaveesha',
    group: 'core',
    appears: ['Core team (2024 article)'],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'sahan-sathsarana',
    name: 'Sahan Sathsarana',
    group: 'core',
    appears: [
      'Core team (2024 article)',
      'Won the FARU 2019 gold award for a poster on population modelling',
    ],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'malith-deshan',
    name: 'Malith Deshan',
    group: 'core',
    appears: ['Core team (2024 article)'],
    confirmation: 'confirmed',
    source: CORE,
  },
  {
    slug: 'harini-sawandi',
    name: 'Harini Sawandi',
    group: 'authors',
    appears: ['First author of the 2026 participatory chatbot paper'],
    confirmation: 'confirmed',
    source: OTHER,
  },
  {
    slug: 'sachin-mamoru',
    name: 'Sachin Mamoru',
    group: 'authors',
    appears: ['First author of the 2026 participatory chatbot paper'],
    confirmation: 'confirmed',
    source: OTHER,
  },
  {
    slug: 'samith-madusanka',
    name: 'Samith Madusanka',
    group: 'authors',
    appears: ['Street Cloud team (LinkedIn post)'],
    confirmation: 'tbc',
    source: OTHER,
  },
  {
    slug: 'choolaka-hewawasam',
    name: 'Choolaka Hewawasam',
    group: 'collaborator',
    affiliation: 'University of Sri Jayewardenepura',
    appears: ['Collaborator on the 2026 paper'],
    confirmation: 'confirmed',
    source: COLLAB,
  },
  {
    slug: 'jasintha-jayasanka',
    name: 'Jasintha Jayasanka',
    group: 'collaborator',
    affiliation: 'University of Sri Jayewardenepura',
    appears: ['Collaborator on the 2026 paper'],
    confirmation: 'confirmed',
    source: COLLAB,
  },
  {
    slug: 'buddhika-amila-kumara',
    name: 'Buddhika Amila Kumara',
    group: 'collaborator',
    affiliation: 'University of Sri Jayewardenepura',
    appears: ['Collaborator on the 2026 paper'],
    confirmation: 'confirmed',
    source: COLLAB,
  },
  {
    slug: 'pradeep-kalansooriya',
    name: 'Pradeep Kalansooriya',
    group: 'collaborator',
    affiliation: 'KDU',
    appears: ['Collaborator on the 2026 paper'],
    confirmation: 'confirmed',
    source: COLLAB,
  },
];

export const CORE_TEAM_COUNT = TEAM.filter((p) => p.group === 'core').length;

export function initials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}
