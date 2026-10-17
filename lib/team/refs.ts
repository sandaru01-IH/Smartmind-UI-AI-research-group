import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public-client';
import { seedNetwork } from './seed';
import type { PersonRef } from '@/lib/catalog/types';

/** Just ids and names of the visible people: enough to name them next to their work. Cached, tag 'team'. */
export async function getMemberRefs(): Promise<PersonRef[]> {
  'use cache';
  cacheTag('team');
  cacheLife({ stale: 60, revalidate: 120, expire: 86400 });
  const db = createPublicClient();
  if (!db) return seedNetwork().members.map((m) => ({ id: m.id, name: m.name, slug: m.slug }));
  const { data, error } = await db
    .from('team_members')
    .select('id,name,slug')
    .eq('visible', true)
    .order('name');
  if (error) throw new Error(`Could not load people: ${error.message}`);
  return (data ?? []) as PersonRef[];
}
