/**
 * Row Level Security for the home page switches, against the local Supabase stack. Visitors read the
 * switches and change nothing; a signed-in non-admin changes nothing; an admin flips them. Skipped when
 * Supabase is not running.
 */
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceKey);

const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
const PASSWORD = 'Rls-Test-Password-1!';
const RUN = Math.random().toString(36).slice(2, 8);

describe.skipIf(!enabled)('Row Level Security: home_sections', () => {
  let service: SupabaseClient;
  let anon: SupabaseClient;
  let admin: SupabaseClient;
  let member: SupabaseClient;
  const userIds: string[] = [];

  async function makeUser(email: string, role: 'admin' | null): Promise<SupabaseClient> {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error('createUser failed');
    userIds.push(data.user.id);
    if (role) {
      const { error: pe } = await service.from('profiles').insert({ id: data.user.id, role });
      if (pe) throw pe;
    }
    const client = createClient(url!, anonKey!, opts);
    const { error: se } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (se) throw se;
    return client;
  }

  const enabledOf = async (id: string) =>
    (await service.from('home_sections').select('enabled').eq('id', id).single()).data?.enabled;

  beforeAll(async () => {
    service = createClient(url!, serviceKey!, opts);
    anon = createClient(url!, anonKey!, opts);
    admin = await makeUser(`rls-home-admin-${RUN}@example.test`, 'admin');
    member = await makeUser(`rls-home-member-${RUN}@example.test`, null);
    await service.from('home_sections').update({ enabled: true }).eq('id', 'medium');
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('home_sections').update({ enabled: true }).eq('id', 'medium');
    for (const id of userIds) await service.auth.admin.deleteUser(id);
  });

  it('seeds the three sections, all on', async () => {
    const { data, error } = await anon.from('home_sections').select('id,enabled').order('id');
    expect(error).toBeNull();
    expect(data).toEqual([
      { id: 'blog', enabled: true },
      { id: 'medium', enabled: true },
      { id: 'video', enabled: true },
    ]);
  });

  it('refuses writes from visitors and signed-in non-admins', async () => {
    await anon.from('home_sections').update({ enabled: false }).eq('id', 'medium');
    await member.from('home_sections').update({ enabled: false }).eq('id', 'medium');
    expect(await enabledOf('medium')).toBe(true);
    expect(
      (await member.from('home_sections').insert({ id: 'extra', enabled: true })).error,
    ).not.toBeNull();
    expect((await anon.from('home_sections').delete().eq('id', 'medium')).error).not.toBeNull();
    expect(await enabledOf('medium')).toBe(true);
  });

  it('lets an admin switch a section off and back on', async () => {
    const off = await admin
      .from('home_sections')
      .update({ enabled: false })
      .eq('id', 'medium')
      .select('enabled')
      .single();
    expect(off.data?.enabled).toBe(false);
    await admin.from('home_sections').update({ enabled: true }).eq('id', 'medium');
    expect(await enabledOf('medium')).toBe(true);
  });

  it('only allows the three known ids', async () => {
    const { error } = await service.from('home_sections').insert({ id: 'sidebar', enabled: true });
    expect(error).not.toBeNull();
  });
});
