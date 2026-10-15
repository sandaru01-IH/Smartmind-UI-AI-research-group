import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public-client';
import { seedNetwork } from './seed';
import { parseLinkRows, parseMemberRows } from './rows';
import { LINK_COLUMNS, TEAM_COLUMNS, type TeamNetworkData } from './types';

/** Public team network. Cached and tagged 'team'; admin edits expire it at once. */
export async function getTeamNetwork(): Promise<TeamNetworkData> {
  'use cache';
  cacheTag('team');
  cacheLife({ stale: 60, revalidate: 60, expire: 3600 });

  const db = createPublicClient();
  if (!db) return seedNetwork();
  const [m, l] = await Promise.all([
    db
      .from('team_members')
      .select(TEAM_COLUMNS)
      .eq('visible', true)
      .order('sort_order')
      .order('name'),
    db.from('team_links').select(LINK_COLUMNS),
  ]);
  if (m.error) throw new Error(`Could not load team: ${m.error.message}`);
  if (l.error) throw new Error(`Could not load team links: ${l.error.message}`);
  const members = parseMemberRows(m.data);
  const ids = new Set(members.map((x) => x.id));
  const links = parseLinkRows(l.data).filter((x) => ids.has(x.a) && ids.has(x.b));
  return { members, links };
}
