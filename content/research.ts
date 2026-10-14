import type { Sourced, ThemeId } from './types';

export interface Project {
  title: string;
  srcFunded: boolean;
}

export interface ResearchTheme {
  id: ThemeId;
  title: string;
  /** CSS variable names from tokens.css (fill and text-safe label). */
  colourVar: string;
  inkVar: string;
  projects: Project[];
  source: string;
}

// Source: this.md > "Research areas" (table). Four themes, four SRC-funded projects.
export const THEMES: ResearchTheme[] = [
  {
    id: 'land',
    title: 'Land use and population',
    colourVar: '--landslide',
    inkVar: '--landslide-ink',
    projects: [
      { title: 'Urban population modelling', srcFunded: true },
      { title: 'Level of vegetation land fragmentation in the Western Province', srcFunded: true },
    ],
    source: 'Research areas (table)',
  },
  {
    id: 'flood',
    title: 'Flood',
    colourVar: '--flood',
    inkVar: '--flood-ink',
    projects: [
      {
        title:
          'A framework linking land use, accessibility, density and surface runoff as a decision tool for planners',
        srcFunded: true,
      },
      {
        title:
          'An urban flood modelling app testing how building regulations cope with uncertain rainfall',
        srcFunded: true,
      },
    ],
    source: 'Research areas (table)',
  },
  {
    id: 'traffic',
    title: 'Traffic and transport',
    colourVar: '--traffic',
    inkVar: '--traffic-ink',
    projects: [
      {
        title: 'Road crash magnitude versus road network configuration, Kegalle',
        srcFunded: false,
      },
      {
        title: 'Built environment versus travellers’ mode choice, Colombo',
        srcFunded: false,
      },
    ],
    source: 'Research areas (table)',
  },
  {
    id: 'ai',
    title: 'AI and machine learning',
    colourVar: '--ai',
    inkVar: '--ai-ink',
    projects: [
      { title: 'A deep-learning framework for road inventory systems', srcFunded: false },
      { title: 'Deep learning for road inventories and 3D urban simulation', srcFunded: false },
    ],
    source: 'Research areas (table)',
  },
];

export const SRC_FUNDED_COUNT = THEMES.flatMap((t) => t.projects).filter((p) => p.srcFunded).length;

// Source: this.md > "Research areas", paragraph on the department's ongoing research page.
export const WIDER_TOPICS: string[] = [
  'Population distribution simulation',
  'Building density and zoning versus runoff',
  'Site-level land use and transport interaction',
  'An AI-based landslide simulation model for Sri Lanka',
  'Land fragmentation and urban sprawl',
  'Citizen-science city mapping',
  'A web-based decision system for Indo-Lankan cities',
];

export const SRC_NOTE = 'SRC-funded: funded by the university’s SRC.';

// Source: this.md > "Research areas", paragraph on 4ONSE. Flagged: confirm whether Smartmind may claim it.
export const FOURONSE: Sourced & {
  name: string;
  summary: string;
  stack: string[];
  partner: string;
} = {
  name: '4ONSE',
  summary:
    'A low-cost weather station built on open hardware, open software, open data and open standards. It measures eight environmental parameters.',
  stack: ['Arduino (open hardware)', 'istSOS (open software)', 'CKAN (open data)', 'OGC standards'],
  partner:
    'A joint project with the University of Applied Sciences and Arts of Southern Switzerland (SUPSI). The department lists it, and the team has yet to confirm that Smartmind may claim it.',
  confirmation: 'tbc',
  source: 'Research areas, 4ONSE paragraph',
};
