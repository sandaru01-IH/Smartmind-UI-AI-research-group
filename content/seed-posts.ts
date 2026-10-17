import type { Post } from '@/lib/posts/types';

/**
 * Seed news. Every item restates a milestone from this.md > "Chatbot journey".
 * Items this.md flags as unconfirmed are drafts flagged `tbc`. Nothing here is invented.
 * Used in demo mode (no Supabase) and by `npm run seed`.
 */
const base = {
  cover_path: null,
  cover_alt: null,
  author_id: null,
  featured: false,
  excerpt: '',
  body_md: '',
  event_date: null,
  link_url: null,
  tags: [] as string[],
  show_in_news: true,
  show_in_ticker: false,
  in_gallery: false,
  in_publications: false,
  in_awards: false,
  tbc: false,
  video_url: null,
  gallery_paths: [] as string[],
  external_links: [] as {
    platform: 'medium' | 'linkedin' | 'youtube' | 'facebook' | 'website';
    url: string;
  }[],
} as const;

const NBRO_URL =
  'https://nbro.gov.lk/index.php?Itemid=190&catid=8&id=564%3Anational-building-research-organisation-nbro-the-smartmind-team-from-university-of-moratuwa-and-manchester-university-uk-are-collaborating-in-order-to-develop-a-chatbot&lang=en&option=com_content&view=article';

export const SEED_POSTS: Post[] = [
  // Source: Chatbot journey, 20–22 May 2026 row. Confirmed: Sciforum paper opened in full.
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000001',
    type: 'article',
    title: 'A participatory chatbot for flood and landslide resilience',
    slug: 'participatory-chatbot-flood-landslide-resilience',
    in_gallery: true,
    excerpt:
      'A WhatsApp-based, multilingual, multi-agent chatbot gives residents preparedness guidance and lets planners interpret risk-sensitive zoning.',
    body_md: [
      'The paper “A Participatory Chatbot for Strengthening Urban Flood and Landslide Resilience” was published on Sciforum on 15 May 2026. It was part of the 1st International Online Conference on Urban Sciences, 20–22 May 2026.',
      '## How it works',
      'The design is WhatsApp-based and multilingual. It uses several agents: a language agent, a live-weather API agent and a scheduler agent.',
      '## Who it serves',
      '- **Residents** get preparedness guidance.\n- **Planners** can interpret risk-sensitive zoning.',
      'The work links to SDG 11 and 13, and indirectly to SDG 9 and 17.',
    ].join('\n\n'),
    category: 'Chatbot',
    tags: ['chatbot', 'flood', 'landslide', 'whatsapp'],
    link_url: 'https://sciforum.net/paper/31118',
    event_date: '2026-05-20',
    featured: true,
    status: 'published',
    published_at: '2026-05-15T06:00:00.000Z',
    created_at: '2026-05-15T06:00:00.000Z',
    updated_at: '2026-05-15T06:00:00.000Z',
  },
  // Source: Chatbot journey, 29 Dec 2023 row. Confirmed: chatbot article opened in full.
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000002',
    type: 'article',
    title: 'Smartmind meets NBRO and the University of Manchester on a landslide chatbot',
    slug: 'nbro-manchester-landslide-chatbot-meeting',
    in_gallery: true,
    excerpt:
      'On 29 December 2023 the team agreed a research project on an AI chatbot for landslide risk, supported by a Manchester grant.',
    body_md: [
      'On 29 December 2023 Smartmind met the National Building Research Organization (NBRO) and the University of Manchester, UK.',
      'The meeting agreed a research project on an AI chatbot for landslide risk. The chatbot covers early warnings, evacuation protocols, resilient-construction details and risk information. A Manchester grant supports the work.',
    ].join('\n\n'),
    category: 'Partnership',
    tags: ['nbro', 'manchester', 'landslide', 'chatbot'],
    link_url: NBRO_URL,
    event_date: '2023-12-29',
    status: 'published',
    published_at: '2023-12-29T06:00:00.000Z',
    created_at: '2023-12-29T06:00:00.000Z',
    updated_at: '2023-12-29T06:00:00.000Z',
  },
  // Source: Awards table, May 2025. Unconfirmed: team member's LinkedIn profile only.
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000003',
    type: 'article',
    title: 'Best Scientific Paper at The Colombo Conference 2025 (ICSD-2025)',
    slug: 'icsd-2025-best-scientific-paper',
    excerpt:
      'A paper on a collaborative approach to disaster management and community awareness, featuring the AI chatbot built for NBRO.',
    body_md:
      'In May 2025 a paper on a collaborative approach to disaster management and community awareness won Best Scientific Paper at The Colombo Conference 2025 (ICSD-2025). It features the AI chatbot built for NBRO.\n\n**To be confirmed:** this.md sources the award to a team member’s LinkedIn profile only. Confirm with the team before publishing.',
    category: 'Award',
    tags: ['award', 'icsd-2025'],
    tbc: true,
    event_date: null,
    status: 'draft',
    published_at: null,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  // Source: Chatbot journey, 22–24 Sep 2026 row. Unconfirmed: team LinkedIn post only.
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000004',
    type: 'article',
    title: 'Street Cloud at the 4th IOER Conference, Dresden',
    slug: 'street-cloud-ioer-dresden',
    excerpt:
      'Citizens share ideas alongside street imagery. Generative and vision AI produce redesign scenarios that planners and people iterate on together.',
    body_md: [
      'Street Cloud was presented at the 4th IOER Conference in Dresden, 22–24 September 2026.',
      'Citizens share ideas alongside street imagery. Generative and vision AI produce redesign scenarios. Planners and people iterate together.',
      'The work was supported by the Alexander von Humboldt Foundation and DAAD, and hosted by TU Dresden’s Chair of Mobility System Planning.',
      '**To be confirmed:** this.md sources this to a team LinkedIn post only. Confirm details and permissions before publishing.',
    ].join('\n\n'),
    category: 'Event',
    tags: ['street-cloud', 'dresden'],
    tbc: true,
    event_date: '2026-09-22',
    status: 'draft',
    published_at: null,
    created_at: '2026-10-14T00:00:00.000Z',
    updated_at: '2026-10-14T00:00:00.000Z',
  },
  // Quick updates for the ticker. Each restates one dated line from this.md.
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000011',
    type: 'update',
    show_in_news: false,
    show_in_ticker: true,
    title: 'Participatory flood and landslide chatbot paper published on Sciforum',
    slug: 'update-sciforum-paper-published',
    category: 'Publication',
    tags: ['sciforum'],
    link_url: 'https://sciforum.net/paper/31118',
    status: 'published',
    published_at: '2026-05-15T05:00:00.000Z',
    created_at: '2026-05-15T05:00:00.000Z',
    updated_at: '2026-05-15T05:00:00.000Z',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000012',
    type: 'update',
    show_in_news: false,
    show_in_ticker: true,
    title: 'Chatbot paper at the 1st International Online Conference on Urban Sciences, 20–22 May',
    slug: 'update-urban-sciences-conference',
    category: 'Event',
    tags: ['conference'],
    link_url: 'https://sciforum.net/paper/31118',
    event_date: '2026-05-20',
    status: 'published',
    published_at: '2026-05-20T05:00:00.000Z',
    created_at: '2026-05-20T05:00:00.000Z',
    updated_at: '2026-05-20T05:00:00.000Z',
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-000000000013',
    type: 'update',
    show_in_news: false,
    show_in_ticker: true,
    title: 'NBRO and Manchester meeting agrees an AI chatbot project for landslide risk',
    slug: 'update-nbro-manchester-meeting',
    category: 'Partnership',
    tags: ['nbro'],
    link_url: NBRO_URL,
    event_date: '2023-12-29',
    status: 'published',
    published_at: '2023-12-29T05:00:00.000Z',
    created_at: '2023-12-29T05:00:00.000Z',
    updated_at: '2023-12-29T05:00:00.000Z',
  },
];
