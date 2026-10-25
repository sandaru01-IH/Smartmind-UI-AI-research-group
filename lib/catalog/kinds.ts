export const CONTENT_KINDS = [
  {
    id: 'awards',
    label: 'Awards',
    blurb: 'Prizes and recognition, linked to the people who won them.',
  },
  {
    id: 'publications',
    label: 'Publications',
    blurb: 'Papers, posters and reports, with their authors from the team.',
  },
  {
    id: 'partners',
    label: 'Partners',
    blurb: 'Institutes the team works with, each with a logo.',
  },
  {
    id: 'journey',
    label: 'Journey',
    blurb:
      'The chatbot timeline on the research page. Tie an entry to a news post to share its switch.',
  },
  {
    id: 'featured',
    label: 'Featured research',
    blurb: 'Key papers and projects highlighted on the home page, each with a figure.',
  },
  {
    id: 'collaborations',
    label: 'Open invitation',
    blurb: 'Projects open to collaboration, with the person to contact and their photo.',
  },
  {
    id: 'research',
    label: 'Research',
    blurb: 'Research themes with their projects, and the wider topics.',
  },
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number]['id'];

export const isContentKind = (v: string): v is ContentKind => CONTENT_KINDS.some((k) => k.id === v);
