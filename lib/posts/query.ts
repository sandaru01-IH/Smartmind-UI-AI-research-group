import { isPubliclyVisible, publicState } from '@/lib/visibility';
import type { AdminListQuery, Post, PublicListQuery, PublicListResult } from './types';

export const visibleSeedPosts = (posts: readonly Post[], now: Date = new Date()): Post[] =>
  posts.filter((p) => isPubliclyVisible(p, now));

const byPublishedDesc = (a: Post, b: Post) =>
  Date.parse(b.published_at ?? '') - Date.parse(a.published_at ?? '');

/** In-memory twin of the Supabase public query. `posts` must already be filtered for visibility. */
export function applyPublicQuery(posts: readonly Post[], query: PublicListQuery = {}): PublicListResult {
  const q = query.q?.trim().toLowerCase();
  const filtered = posts
    .filter((p) => !query.type || p.type === query.type)
    .filter((p) => !query.category || p.category === query.category)
    .filter((p) => !query.tag || p.tags.includes(query.tag))
    .filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q),
    )
    .sort(byPublishedDesc);
  const offset = Math.max(0, query.offset ?? 0);
  const limit = query.limit ?? filtered.length;
  return { posts: filtered.slice(offset, offset + limit), total: filtered.length };
}

export function applyAdminQuery(
  posts: readonly Post[],
  query: AdminListQuery = {},
  now: Date = new Date(),
): Post[] {
  const q = query.q?.trim().toLowerCase();
  const rows = posts
    .filter((p) => !query.type || query.type === 'all' || p.type === query.type)
    .filter((p) => !query.category || query.category === 'all' || p.category === query.category)
    .filter((p) => {
      const s = query.status ?? 'all';
      if (s === 'all') return true;
      const state = publicState(p, now);
      if (s === 'draft') return state === 'draft';
      if (s === 'scheduled') return state === 'scheduled';
      return state === 'live';
    })
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.slug.includes(q) || p.tags.some((t) => t.includes(q)));
  const sort = query.sort ?? 'updated';
  return [...rows].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'published') return byPublishedDesc(a, b);
    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });
}
