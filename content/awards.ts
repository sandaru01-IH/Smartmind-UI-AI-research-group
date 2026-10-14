import type { Sourced } from './types';

export interface Award extends Sourced {
  id: string;
  when: string;
  year: number;
  award: string;
  who: string;
  event: string;
  reason?: string;
}

const DEPT = 'Awards (table; 2018 and 2019 entries sourced to the department’s ongoing research page)';
const LINKEDIN = 'Awards (table; 2024 and 2025 entries sourced to team members’ LinkedIn profiles)';

// Source: this.md > "Awards". Newest first.
export const AWARDS: Award[] = [
  {
    id: 'icsd-2025',
    year: 2025,
    when: 'May 2025',
    award: 'Best Scientific Paper',
    who: 'Sandaruwan Sankalpa Silva and team',
    event: 'The Colombo Conference 2025 (ICSD-2025), Colombo',
    reason: 'For the NBRO disaster chatbot paper',
    confirmation: 'tbc',
    source: LINKEDIN,
  },
  {
    id: 'r4tli-2024',
    year: 2024,
    when: '2024',
    award: 'Best Paper, Transport Planning category',
    who: 'Harini Sawandi',
    event: '9th International Conference on Research for Transport and Logistics Industry (R4TLI 2024)',
    reason: 'For a GeoAI walking-behaviour study',
    confirmation: 'tbc',
    source: LINKEDIN,
  },
  {
    id: 'wcise19-planning',
    year: 2019,
    when: 'December 2019',
    award: 'Best Researcher in Urban Planning',
    who: 'Amila Jayasinghe',
    event: 'WCISE19, Bangkok',
    confirmation: 'confirmed',
    source: DEPT,
  },
  {
    id: 'wcise19-environment',
    year: 2019,
    when: 'December 2019',
    award: 'Best Researcher in Environment Science',
    who: 'Chethika Abenayake',
    event: 'WCISE19, Bangkok',
    confirmation: 'confirmed',
    source: DEPT,
  },
  {
    id: 'icon-messsh19',
    year: 2019,
    when: '2019',
    award: 'Best Paper',
    who: 'Amila Jayasinghe',
    event: 'iCon-MESSSH’19, Phuket',
    reason: 'For the road-network population simulation paper',
    confirmation: 'confirmed',
    source: DEPT,
  },
  {
    id: 'faru-2019',
    year: 2019,
    when: '2019',
    award: 'Gold Award (poster)',
    who: 'Sahan Sathsarana',
    event: 'FARU 2019, 12th International Research Conference, University of Moratuwa',
    confirmation: 'confirmed',
    source: DEPT,
  },
  {
    id: 'easts-2018',
    year: 2018,
    when: '2018',
    award: 'Best Student Paper',
    who: 'Tenzin',
    event: '13th Eastern Asia Society for Transportation Studies conference, Colombo',
    confirmation: 'confirmed',
    source: DEPT,
  },
  {
    id: 'foss4g-2018',
    year: 2018,
    when: '2018',
    award: 'Best Paper, academic track (student)',
    who: 'Vajeeha',
    event: 'FOSS4G Asia 2018, Moratuwa',
    confirmation: 'confirmed',
    source: DEPT,
  },
  {
    id: 'r4tli-2018',
    year: 2018,
    when: '2018',
    award: 'Best Research in Highways and Safety',
    who: 'Lakmali',
    event: '3rd R4TLI conference, Colombo',
    reason: 'For a study of the Galle Road bus priority lane',
    confirmation: 'confirmed',
    source: DEPT,
  },
];

/** File order is the order in this.md (newest first). No month precision is invented. */
export const AWARDS_NEWEST_FIRST: readonly Award[] = AWARDS;
export const CONFIRMED_AWARD_COUNT = AWARDS.filter((a) => a.confirmation === 'confirmed').length;
