import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveHomeSections, type HomeSections } from './sections';

/** The switches as the admin sees them. Callers pass the session client from requireAdmin(). */
export async function adminHomeSections(db: SupabaseClient): Promise<HomeSections> {
  const { data, error } = await db.from('home_sections').select('id,enabled');
  if (error && /does not exist|schema cache/i.test(error.message)) return resolveHomeSections(null);
  if (error) throw new Error(`Could not load home sections: ${error.message}`);
  return resolveHomeSections(data);
}
