import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseLinkRows, parseMemberRows } from './rows';
import type { TeamLinkInput, TeamMemberInput } from './schema';
import { LINK_COLUMNS, TEAM_COLUMNS, type TeamLink, type TeamMember } from './types';

/** Admin data access for the team network. Callers pass the session client from requireAdmin(). */

export async function adminTeam(db: SupabaseClient): Promise<{
  members: TeamMember[];
  links: TeamLink[];
}> {
  const [m, l] = await Promise.all([
    db.from('team_members').select(TEAM_COLUMNS).order('sort_order').order('name'),
    db.from('team_links').select(LINK_COLUMNS),
  ]);
  if (m.error) throw new Error(`Could not load team: ${m.error.message}`);
  if (l.error) throw new Error(`Could not load links: ${l.error.message}`);
  return { members: parseMemberRows(m.data), links: parseLinkRows(l.data) };
}

export async function adminMember(db: SupabaseClient, id: string): Promise<TeamMember | null> {
  const { data, error } = await db
    .from('team_members')
    .select(TEAM_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? parseMemberRows([data])[0] : null;
}

export async function insertMember(db: SupabaseClient, v: TeamMemberInput): Promise<TeamMember> {
  const { data, error } = await db.from('team_members').insert(v).select(TEAM_COLUMNS).single();
  if (error) {
    if (error.code === '23505') throw new Error('That slug is already used.');
    throw new Error(error.message);
  }
  return parseMemberRows([data])[0];
}

export async function updateMember(
  db: SupabaseClient,
  id: string,
  v: TeamMemberInput,
): Promise<TeamMember> {
  const { data, error } = await db
    .from('team_members')
    .update(v)
    .eq('id', id)
    .select(TEAM_COLUMNS)
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('That slug is already used.');
    throw new Error(error.message);
  }
  return parseMemberRows([data])[0];
}

export async function deleteMember(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('team_members').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function insertLink(db: SupabaseClient, v: TeamLinkInput): Promise<TeamLink> {
  const { data, error } = await db.from('team_links').insert(v).select(LINK_COLUMNS).single();
  if (error) {
    if (error.code === '23505') throw new Error('Those two people are already connected.');
    throw new Error(error.message);
  }
  return parseLinkRows([data])[0];
}

export async function updateLinkLabel(
  db: SupabaseClient,
  id: string,
  label: string,
): Promise<void> {
  const { error } = await db.from('team_links').update({ label }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteLink(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('team_links').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
