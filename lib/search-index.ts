import 'server-only';
import { PAGE_INDEX } from '@/components/layout/nav-items';
import { CHATBOT_PAPERS, LAB_PAPERS } from '@/content/publications';
import { listPosts } from '@/lib/posts/public';
import { getTeamNetwork } from '@/lib/team/public';

export interface SearchEntry {
  id: string;
  group: 'pages' | 'news' | 'publications' | 'team';
  label: string;
  hint?: string;
  href: string;
  external?: boolean;
}

/** Everything the command palette can find: pages, live news, publications and team. */
export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const [{ posts }, { members }] = await Promise.all([
    listPosts({ type: 'article', limit: 50 }),
    getTeamNetwork(),
  ]);
  return [
    ...PAGE_INDEX.map((p) => ({
      id: `page:${p.href}`,
      group: 'pages' as const,
      label: p.label,
      href: p.href,
    })),
    ...posts.map((p) => ({
      id: `news:${p.slug}`,
      group: 'news' as const,
      label: p.title,
      hint: p.category,
      href: `/news/${p.slug}`,
    })),
    ...[...CHATBOT_PAPERS, ...LAB_PAPERS].flatMap((p) =>
      p.href
        ? [
            {
              id: `pub:${p.id}`,
              group: 'publications' as const,
              label: p.title,
              hint: `${p.year} · ${p.venue}`,
              href: p.href,
              external: true,
            },
          ]
        : [],
    ),
    ...members.map((m) => ({
      id: `team:${m.slug}`,
      group: 'team' as const,
      label: m.name,
      href: '/team',
    })),
  ];
}
