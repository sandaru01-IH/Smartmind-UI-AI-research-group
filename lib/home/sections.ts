import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public-client';
import {
  HOME_SECTION_IDS,
  HOME_SECTION_LABELS,
  type HomeSectionId,
  type HomeSections,
} from './section-ids';

export { HOME_SECTION_IDS, HOME_SECTION_LABELS };
export type { HomeSectionId, HomeSections };

/** Turns stored rows into switches. Missing, unknown or malformed rows leave a section on. */
export function resolveHomeSections(rows: unknown): HomeSections {
  const result: HomeSections = { video: true, medium: true, blog: true };
  if (!Array.isArray(rows)) return result;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { id, enabled } = row as { id?: unknown; enabled?: unknown };
    if (typeof enabled !== 'boolean') continue;
    if ((HOME_SECTION_IDS as readonly unknown[]).includes(id))
      result[id as HomeSectionId] = enabled;
  }
  return result;
}

/** Public read of the switches. Tag: 'home-sections'. Demo mode and a missing table leave all on. */
export async function getHomeSections(): Promise<HomeSections> {
  'use cache';
  cacheTag('home-sections');
  cacheLife({ stale: 30, revalidate: 30, expire: 3600 });
  const db = createPublicClient();
  if (!db) return resolveHomeSections(null);
  const { data, error } = await db.from('home_sections').select('id,enabled');
  if (error && /does not exist|schema cache/i.test(error.message)) return resolveHomeSections(null);
  if (error) throw new Error(`Could not load home sections: ${error.message}`);
  return resolveHomeSections(data);
}
