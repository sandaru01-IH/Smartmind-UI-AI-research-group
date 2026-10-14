import type { Sourced } from './types';

export interface Milestone extends Sourced {
  id: string;
  /** Shown as the oversized mono year. */
  year: string;
  /** Human readable date text, exactly as dated in this.md. */
  when: string;
  title: string;
  detail: string;
  links?: { label: string; href: string }[];
}

const SRC = 'Chatbot journey (table)';

// Source: this.md > "Chatbot journey". Newest first in this.md; listed oldest first here for the timeline.
export const MILESTONES: Milestone[] = [
  {
    id: 'exmo-2023',
    year: '2023',
    when: '2023',
    title: 'First chatbot launched at EXMO 2023',
    detail:
      'Launched at EXMO 2023, University of Moratuwa. Trained on real district development plans. Visitor feedback fed a published paper.',
    confirmation: 'confirmed',
    source: SRC,
  },
  {
    id: 'chatbot-2',
    year: '2023',
    when: '2023, after EXMO',
    title: 'Chatbot 2.0',
    detail:
      'Built on the Hugging Chat language model with web search, tuned response filters, a user-friendly interface and a “Pro Planning Mode”. A custom version was made for Port City Colombo.',
    confirmation: 'confirmed',
    source: SRC,
  },
  {
    id: 'nbro-manchester',
    year: '2023',
    when: '29 December 2023',
    title: 'Meeting with NBRO and the University of Manchester, UK',
    detail:
      'Agreed a research project on an AI chatbot for landslide risk: early warnings, evacuation protocols, resilient-construction details and risk information. Supported by a Manchester grant.',
    links: [
      {
        label: 'Chatbot article',
        href: 'https://thechatbot.net/urban-planning-chatbot-sri-lanka/',
      },
      {
        label: 'NBRO news item',
        href: 'https://nbro.gov.lk/index.php?Itemid=190&catid=8&id=564%3Anational-building-research-organisation-nbro-the-smartmind-team-from-university-of-moratuwa-and-manchester-university-uk-are-collaborating-in-order-to-develop-a-chatbot&lang=en&option=com_content&view=article',
      },
    ],
    confirmation: 'confirmed',
    source: SRC,
  },
  {
    id: 'icsd-2025',
    year: '2025',
    when: 'May 2025',
    title: 'Best Scientific Paper, The Colombo Conference 2025 (ICSD-2025)',
    detail:
      'A paper on a collaborative approach to disaster management and community awareness, featuring the AI chatbot built for NBRO.',
    confirmation: 'tbc',
    source: `${SRC}; source is a team member’s LinkedIn profile`,
  },
  {
    id: 'participatory-2026',
    year: '2026',
    when: '20–22 May 2026',
    title: 'Participatory flood and landslide chatbot',
    detail:
      'Presented at the 1st International Online Conference on Urban Sciences. WhatsApp-based, multilingual, multi-agent design with language, live-weather API and scheduler agents. It gives residents preparedness guidance and lets planners interpret risk-sensitive zoning. Linked to SDG 11 and 13, and indirectly 9 and 17. Published 15 May 2026 on Sciforum.',
    links: [{ label: 'Paper on Sciforum', href: 'https://sciforum.net/paper/31118' }],
    confirmation: 'confirmed',
    source: SRC,
  },
  {
    id: 'street-cloud-2026',
    year: '2026',
    when: '22–24 September 2026',
    title: 'Street Cloud at the 4th IOER Conference, Dresden',
    detail:
      'Citizens share ideas alongside street imagery. Generative and vision AI produce redesign scenarios. Planners and people iterate together. Supported by the Alexander von Humboldt Foundation and DAAD, hosted by TU Dresden’s Chair of Mobility System Planning.',
    confirmation: 'tbc',
    source: `${SRC}; source is a team LinkedIn post`,
  },
];

// Source: this.md > "Chatbot journey", closing paragraph.
export const CHATBOT_PHILOSOPHY = {
  statement:
    'Institution-specific chatbots handle large workloads quickly and reduce dependence on individual officials.',
  invitation:
    'The team invites collaboration to build tailored chatbots for individuals and institutions.',
} as const;

/**
 * Architecture of the 2026 participatory chatbot.
 * Source: this.md > Chatbot journey > 20–22 May 2026 row. Only components named there are drawn.
 */
export const ARCHITECTURE = {
  source: 'Chatbot journey, 20–22 May 2026 row',
  channel: 'WhatsApp',
  agents: [
    { id: 'language', label: 'Language agent', note: 'Multilingual' },
    { id: 'weather', label: 'Live-weather API agent', note: 'Weather data' },
    { id: 'scheduler', label: 'Scheduler agent', note: 'Timing of messages' },
  ],
  outputs: [
    { id: 'residents', label: 'Residents', note: 'Preparedness guidance' },
    { id: 'planners', label: 'Planners', note: 'Risk-sensitive zoning' },
  ],
} as const;
