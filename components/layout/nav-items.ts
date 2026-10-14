import { t } from '@/content/strings';

export interface NavItem {
  href: string;
  label: string;
}

/** Primary navigation. Contact and Collaborate share one call to action in the header. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/about', label: t.nav.about },
  { href: '/research', label: t.nav.research },
  { href: '/chatbots', label: t.nav.chatbots },
  { href: '/team', label: t.nav.team },
  { href: '/publications', label: t.nav.publications },
  { href: '/awards', label: t.nav.awards },
  { href: '/partners', label: t.nav.partners },
  { href: '/news', label: t.nav.news },
];

export const CTA_ITEM: NavItem = { href: '/collaborate', label: t.nav.collaborate };

export const PAGE_INDEX: NavItem[] = [
  { href: '/', label: t.nav.home },
  ...NAV_ITEMS,
  CTA_ITEM,
  { href: '/contact', label: t.nav.contact },
];
