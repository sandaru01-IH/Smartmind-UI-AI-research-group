import { t } from '@/content/strings';

export interface NavItem {
  href: string;
  label: string;
}

/** A top-bar entry that opens a dropdown of pages instead of linking to one. */
export interface NavGroup {
  label: string;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const isNavGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

/** Blog, Medium articles, Videos and News share one top-bar item. */
export const STORIES_GROUP: NavGroup = {
  label: t.nav.stories,
  children: [
    { href: '/blog', label: t.nav.blog },
    { href: '/medium', label: t.nav.medium },
    { href: '/videos', label: t.nav.videos },
    { href: '/news', label: t.nav.news },
  ],
};

/** Primary navigation. Contact and Collaborate share one call to action in the header. */
export const NAV_ITEMS: NavEntry[] = [
  { href: '/about', label: t.nav.about },
  { href: '/research', label: t.nav.research },
  { href: '/publications', label: t.nav.publications },
  { href: '/awards', label: t.nav.awards },
  { href: '/gallery', label: t.nav.gallery },
  { href: '/team', label: t.nav.team },
  STORIES_GROUP,
  { href: '/collaborate', label: t.nav.collaborate },
];

export const CTA_ITEM: NavItem = { href: '/contact', label: t.nav.contact };

/** Every navigation link as a flat list, with group children in place. */
export const FLAT_NAV_ITEMS: NavItem[] = NAV_ITEMS.flatMap((e) =>
  isNavGroup(e) ? e.children : [e],
);

export const PAGE_INDEX: NavItem[] = [
  { href: '/', label: t.nav.home },
  ...FLAT_NAV_ITEMS,
  CTA_ITEM,
];
