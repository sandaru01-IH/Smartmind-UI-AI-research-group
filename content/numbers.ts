import { CONFIRMED_AWARD_COUNT } from './awards';
import { LISTED_PAPER_COUNT } from './publications';
import { PARTNERS } from './partners';
import { THEMES } from './research';
import { CORE_TEAM_COUNT } from './team';

export interface NumberStat {
  id: string;
  value: number;
  label: string;
  /** Shown on hover and focus. Names the section of this.md the figure comes from. */
  source: string;
}

/**
 * Figures for the numbers strip. Every value is computed from the content modules, so it can only
 * change when the sourced content changes. Unconfirmed figures (for example the 4ONSE station
 * count) are deliberately absent.
 */
export const NUMBERS: NumberStat[] = [
  {
    id: 'papers',
    value: LISTED_PAPER_COUNT,
    label: 'Listed papers',
    source: 'this.md, Publications: the lab page lists twelve papers from 2019 to 2021.',
  },
  {
    id: 'team',
    value: CORE_TEAM_COUNT,
    label: 'Core team members',
    source: 'this.md, Team: eight people named as the core team in a January 2024 article.',
  },
  {
    id: 'themes',
    value: THEMES.length,
    label: 'Research themes',
    source: 'this.md, Research areas: the lab groups its ongoing research into four themes.',
  },
  {
    id: 'awards',
    value: CONFIRMED_AWARD_COUNT,
    label: 'Awards, 2018 and 2019',
    source:
      'this.md, Awards: seven awards from 2018 and 2019, sourced to the department’s ongoing research page.',
  },
  {
    id: 'partners',
    value: PARTNERS.length,
    label: 'Listed partners',
    source: 'this.md, Partners: seven national and seven international partners on the lab page.',
  },
];
