'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { seedNetwork } from '@/lib/team/seed';
import {
  adminMember,
  adminTeam,
  deleteLink,
  deleteMember,
  insertLink,
  insertMember,
  updateLinkLabel,
  updateMember,
} from '@/lib/team/admin';
import { teamLinkSchema, teamMemberSchema } from '@/lib/team/schema';
import type { TeamLink, TeamMember } from '@/lib/team/types';
import type { ActionResult } from './actions';

function refreshTeam(): void {
  updateTag('team');
  revalidatePath('/team');
  revalidatePath('/');
}

const fail = (message: string, fieldErrors?: Record<string, string[]>) =>
  ({ ok: false, message, fieldErrors }) as const;

export async function saveMemberAction({
  id,
  values,
}: {
  id: string | null;
  values: unknown;
}): Promise<ActionResult<TeamMember>> {
  const { supabase } = await requireAdmin();
  const parsed = teamMemberSchema.safeParse(values);
  if (!parsed.success) {
    return fail(
      'Fix the highlighted fields.',
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  if (parsed.data.photo_path && !parsed.data.photo_alt) {
    return fail('Describe the photo for screen readers.', { photo_alt: ['Required'] });
  }
  try {
    const saved = id
      ? await updateMember(supabase, id, parsed.data)
      : await insertMember(supabase, parsed.data);
    refreshTeam();
    return { ok: true, data: saved };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not save this person.');
  }
}

export async function deleteMemberAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown person.');
  try {
    if (!(await adminMember(supabase, id))) return { ok: true };
    await deleteMember(supabase, id);
    refreshTeam();
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not delete this person.');
  }
}

export async function addLinkAction(values: unknown): Promise<ActionResult<TeamLink>> {
  const { supabase } = await requireAdmin();
  const parsed = teamLinkSchema.safeParse(values);
  if (!parsed.success) {
    return fail(
      'Pick two different people.',
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  try {
    const saved = await insertLink(supabase, parsed.data);
    refreshTeam();
    return { ok: true, data: saved };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not add the connection.');
  }
}

export async function updateLinkAction(id: string, label: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown connection.');
  const parsed = z.string().trim().max(80).safeParse(label);
  if (!parsed.success) return fail('Keep the label under 80 characters.');
  try {
    await updateLinkLabel(supabase, id, parsed.data);
    refreshTeam();
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not update the connection.');
  }
}

export async function deleteLinkAction(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return fail('Unknown connection.');
  try {
    await deleteLink(supabase, id);
    refreshTeam();
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not remove the connection.');
  }
}

/** One-time helper: loads the sourced starter people and connections when the team table is empty. */
export async function importStarterTeamAction(): Promise<ActionResult<{ members: number }>> {
  const { supabase } = await requireAdmin();
  try {
    const existing = await adminTeam(supabase);
    if (existing.members.length > 0) return fail('The team is not empty, so nothing was imported.');
    const seed = seedNetwork();
    const bySlug = new Map<string, string>();
    for (const m of seed.members) {
      const input = teamMemberSchema.parse({
        slug: m.slug,
        name: m.name,
        role: m.role,
        group_label: m.group_label,
        affiliation: m.affiliation,
        education: m.education,
        qualifications: m.qualifications,
        contribution: m.contribution,
        sort_order: m.sort_order,
      });
      const row = await insertMember(supabase, input);
      bySlug.set(m.slug, row.id);
    }
    for (const l of seed.links) {
      const a = bySlug.get(l.a);
      const b = bySlug.get(l.b);
      if (a && b) await insertLink(supabase, { a, b, label: l.label });
    }
    refreshTeam();
    return { ok: true, data: { members: seed.members.length } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not import the starter team.');
  }
}
