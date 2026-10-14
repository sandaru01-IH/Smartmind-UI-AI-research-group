import { LAB_PAPERS, CHATBOT_PAPERS } from '@/content/publications';
import { TEAM } from '@/content/team';
import { confirmedOnly } from '@/content/types';
import { PAGE_INDEX } from '@/components/layout/nav-items';
import { listPosts } from '@/lib/posts/public';
import { CommandPalette, type PaletteItem } from './command-palette';

/** Builds the search index on the server: pages, live news, publications and team. */
export async function PaletteLoader() {
  const { posts } = await listPosts({ type: 'article', limit: 50 });
  const items: PaletteItem[] = [
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
    ...confirmedOnly(TEAM).map((m) => ({
      id: `team:${m.slug}`,
      group: 'team' as const,
      label: m.name,
      href: '/team',
    })),
  ];
  return <CommandPalette items={items} />;
}
