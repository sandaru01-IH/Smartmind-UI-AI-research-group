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
    team: 'Team',
    publications: 'Publications',
    awards: 'Awards',
    gallery: 'Gallery & Partners',
    news: 'News',
    collaborate: 'Open invitation',
    contact: 'Contact us',
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
    eyebrow: 'Smartmind UI & SI · Urban Informatics & Super Intelligence',
    fallbackLabel:
      'Layered road networks drawn as nodes and links. Fainter networks sit behind a nearer one. Larger nodes carry more routes.',
    primaryCta: 'Explore the research',
    secondaryCta: 'The journey',
  },
  home: {
    latest: 'Latest',
    latestLead: 'What the network has been doing.',
    allNews: 'All news',
    numbers: 'In numbers',
    researchTitle: 'Research themes',
    researchLead: 'Cities, disasters, movement and learning machines, studied as one system.',
    researchCta: 'All research',
    journeyTitle: 'The Journey of Smartmind',
    journeyLead: 'From the first planning chatbot in 2023 to flood and landslide warnings in 2026.',
    journeyCta: 'The full journey',
    philosophyTitle: 'Intelligence + Love',
    philosophyLead: 'Open, Reproducible and Simple: the three ideas behind everything we build.',
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
    contact: 'University contact',
    smartmindContact: 'Email us',
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
