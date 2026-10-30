'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { HOME_SECTION_IDS, type HomeSectionId } from '@/lib/home/section-ids';
import type { ActionResult } from './actions';

/** Switches one optional home page section on or off. */
export async function setHomeSectionAction(
  id: HomeSectionId,
  enabled: boolean,
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!(HOME_SECTION_IDS as readonly string[]).includes(id) || typeof enabled !== 'boolean')
    return { ok: false, message: 'Unknown section.' };
  const { error } = await supabase.from('home_sections').update({ enabled }).eq('id', id);
  if (error) return { ok: false, message: error.message };
  updateTag('home-sections');
  revalidatePath('/');
  return { ok: true };
}
