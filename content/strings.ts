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
    stories: 'Stories',
    blog: 'Blog',
    medium: 'Medium articles',
    videos: 'Videos',
    collaborate: 'Open invitation',
    contact: 'Contact us',
    menu: 'Menu',
    closeMenu: 'Close menu',
    primary: 'Primary',
    footer: 'Footer',
    search: 'Search',
  },
  videos: { play: 'Play video' },
  stories: {
    eyebrow: 'Stories',
    blogTitle: 'Blog',
    blogLead: 'Writing from people in the network: expertise, research and ideas.',
    blogEmpty: 'No posts yet.',
    mediumTitle: 'Medium articles',
    mediumLead: 'Articles the team has published on Medium.',
    mediumEmpty: 'No Medium articles yet.',
    mediumBadge: 'Medium',
    videosTitle: 'Videos',
    videosLead: 'Talks and explainers from the Smartmind YouTube channel.',
    videosEmpty: 'Videos will appear here soon.',
    videosChannel: 'Watch everything on the Smartmind YouTube channel',
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
    contact: 'Contact the team',
    smartmindContact: 'Email us',
    follow: 'Facebook',
    youtube: 'YouTube',
    rights: 'Smartmind, Urban Simulation Lab, University of Moratuwa.',
  },
  palette: {
    open: 'Search the site',
    placeholder: 'Search pages, news, publications, team',
    hint: 'Ctrl or ⌘ + K',
    empty: 'No matches.',
    pages: 'Pages',
    news: 'News',
    stories: 'Stories',
    blog: 'Blog',
    medium: 'Medium articles',
    videos: 'Videos',
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
