/**
 * UI strings. English only for launch (British spelling).
 * To add Sinhala or Tamil later: add a dictionary of the same shape under `dictionaries`
 * and pick it by locale in `getStrings`. Components must not hard-code visible text.
 */
const en = {
  localeName: 'English',
  skipToContent: 'Skip to content',
  nav: {
    home: 'Home',
    about: 'About',
    research: 'Research',
    chatbots: 'Chatbots',
    team: 'Team',
    publications: 'Publications',
    awards: 'Awards',
    partners: 'Partners',
    news: 'News',
    collaborate: 'Collaborate',
    contact: 'Contact',
    menu: 'Menu',
    closeMenu: 'Close menu',
    primary: 'Primary',
    footer: 'Footer',
    search: 'Search',
  },
  theme: { toDark: 'Switch to dark theme', toLight: 'Switch to light theme', label: 'Theme' },
  ticker: {
    label: 'Latest',
    live: 'Live',
    region: 'Latest updates',
    pause: 'Pause updates',
    play: 'Play updates',
    empty: 'No updates yet.',
  },
  hero: {
    eyebrow: 'GeoAI network · Urban Simulation Lab',
    legend: 'agents rerouting around flooded roads',
    legendHint: 'Point at a road to flood it and the roads joined to it.',
    fallbackLabel: 'A road network drawn as nodes and links. Larger nodes carry more routes.',
    simulationLabel:
      'Road network simulation. Agents travel along roads and reroute around flooded sections.',
    primaryCta: 'Explore the research',
    secondaryCta: 'Meet the chatbots',
  },
  home: {
    latest: 'Latest',
    latestLead: 'What the network has been doing.',
    allNews: 'All news',
    numbers: 'In numbers',
    researchTitle: 'Four research themes',
    researchLead: 'Land, water, movement and learning machines, studied as one system.',
    researchCta: 'All research',
    chatbotsTitle: 'From planning Q&A to flood warnings',
    chatbotsLead: 'A line of chatbots built with planners, for planners and residents.',
    chatbotsCta: 'The full journey',
    partnersTitle: 'Partners',
    partnersLead: 'National and international research partners of the Urban Simulation Lab.',
    collaborateTitle: 'Build a chatbot with us',
    collaborateLead:
      'Institution-specific chatbots handle large workloads and reduce dependence on individual officials.',
    collaborateCta: 'Start a conversation',
  },
  common: {
    readMore: 'Read more',
    source: 'Source',
    toBeConfirmed: 'To be confirmed',
    external: 'opens in a new tab',
    back: 'Back',
    loadMore: 'Load more',
    all: 'All',
    search: 'Search',
    noResults: 'Nothing matches those filters.',
    clear: 'Clear filters',
    theme: 'Theme',
    featured: 'Featured',
    scheduled: 'Scheduled',
    draft: 'Draft',
  },
  footer: {
    partOf:
      'Smartmind is part of the Urban Simulation Lab, Department of Town & Country Planning, University of Moratuwa.',
    notRelated: 'Not related to other organisations of the same name:',
    contact: 'University contact',
    follow: 'Facebook',
    rights: 'Smartmind, Urban Simulation Lab, University of Moratuwa.',
  },
  palette: {
    open: 'Search the site',
    placeholder: 'Search pages, news, publications, team',
    hint: 'Ctrl or ⌘ + K',
    empty: 'No matches.',
    pages: 'Pages',
    news: 'News',
    publications: 'Publications',
    team: 'Team',
    results: 'Search results',
  },
  errors: {
    notFoundTitle: 'This road is closed',
    notFoundBody: 'The page you asked for does not exist, or it has moved.',
    errorTitle: 'Something broke on our side',
    errorBody: 'The page failed to load. Try again, or head back home.',
    retry: 'Try again',
    home: 'Back to home',
  },
} as const;

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Strings = DeepString<typeof en>;

const dictionaries: Record<'en', Strings> = { en };

export function getStrings(locale: keyof typeof dictionaries = 'en'): Strings {
  return dictionaries[locale];
}

export const t: Strings = getStrings('en');
