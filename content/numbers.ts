import { CONFIRMED_AWARD_COUNT } from './awards';
import { LISTED_PAPER_COUNT } from './publications';
import { PARTNERS } from './partners';
import { THEMES } from './research';

export interface NumberStat {
  id: string;
  value: number;
  label: string;
  /** Where the figure comes from. For maintainers only: it is not shown on the site. */
  source: string;
}

/**
 * Figures for the numbers strip. The team figure comes from the live team list (the admin edits it),
 * everything else is computed from the sourced content modules, so a figure only changes when its
 * source does. Unconfirmed figures (for example the 4ONSE station count) are deliberately absent.
 */
export function getNumbers(teamCount: number): NumberStat[] {
  return [
    {
      id: 'papers',
      value: LISTED_PAPER_COUNT,
      label: 'Listed papers',
      source: 'this.md, Publications: the lab page lists twelve papers from 2019 to 2021.',
    },
    {
      id: 'team',
      value: teamCount,
      label: 'People in the network',
      source: 'The team list, edited in the admin.',
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
}
