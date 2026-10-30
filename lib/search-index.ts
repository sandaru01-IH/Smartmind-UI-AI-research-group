import 'server-only';
import { PAGE_INDEX } from '@/components/layout/nav-items';
import { listBlogPosts } from '@/lib/blog/public';
import { getMediumArticles, getPublications } from '@/lib/catalog/public';
import { listPosts } from '@/lib/posts/public';
import { getTeamNetwork } from '@/lib/team/public';

export interface SearchEntry {
  id: string;
  group: 'pages' | 'news' | 'blog' | 'medium' | 'publications' | 'team';
  label: string;
  hint?: string;
  href: string;
  external?: boolean;
}

/** Everything the command palette can find: pages, live news, publications and team. */
export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const [{ posts }, { members }, publications, blog, medium] = await Promise.all([
    listPosts({ type: 'article', limit: 50 }),
    getTeamNetwork(),
    getPublications(),
    listBlogPosts({ limit: 50 }),
    getMediumArticles(50),
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
    ...blog.posts.map((p) => ({
      id: `blog:${p.slug}`,
      group: 'blog' as const,
      label: p.title,
      hint: p.author?.displayName,
      href: `/blog/${p.slug}`,
    })),
    ...medium.map((a) => ({
      id: `medium:${a.id}`,
      group: 'medium' as const,
      label: a.title,
      hint: a.author_name || undefined,
      href: a.url,
      external: true,
    })),
    ...publications.flatMap((p) =>
      p.href && !p.fromPost
        ? [
            {
              id: `pub:${p.id}`,
              group: 'publications' as const,
              label: p.title,
              hint: [p.year, p.venue].filter(Boolean).join(' · '),
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
