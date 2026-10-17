import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { getMemberWorks } from '@/lib/catalog/public';
import { createPublicClient } from '@/lib/supabase/public-client';
import { seedNetwork } from './seed';
import { deriveLinks, isPaper } from './derive';
import { parseLinkRows, parseMemberRows } from './rows';
import { LINK_COLUMNS, TEAM_COLUMNS, type TeamNetworkData } from './types';

/** Public team network. Cached and tagged 'team'; admin edits expire it at once. */
export async function getTeamNetwork(): Promise<TeamNetworkData> {
  'use cache';
  cacheTag('team', 'works', 'posts', 'awards', 'publications');
  cacheLife({ stale: 60, revalidate: 120, expire: 86400 });

  const db = createPublicClient();
  if (!db) return seedNetwork();
  const [m, l, works] = await Promise.all([
    db
      .from('team_members')
      .select(TEAM_COLUMNS)
      .eq('visible', true)
      .order('sort_order')
      .order('name'),
    db.from('team_links').select(LINK_COLUMNS),
    getMemberWorks(),
  ]);
  if (m.error) throw new Error(`Could not load team: ${m.error.message}`);
  if (l.error) throw new Error(`Could not load team links: ${l.error.message}`);
  const ids = new Set((m.data ?? []).map((x: { id: string }) => x.id));
  const manual = parseLinkRows(l.data).filter((x) => ids.has(x.a) && ids.has(x.b));
  const members = parseMemberRows(m.data).map((p) => {
    const list = works[p.id] ?? [];
    const papers = (p.papers ?? 0) + list.filter(isPaper).length;
    return { ...p, works: list, papers: p.papers === null && papers === 0 ? null : papers };
  });
  return { members, links: [...manual, ...deriveLinks(works, manual)] };
}
