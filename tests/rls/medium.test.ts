/**
 * Row Level Security for Medium articles, against the local Supabase stack (`npx supabase start`).
 * Proves: visitors read only visible articles and write nothing; a signed-in non-admin cannot write;
 * an admin can run the full lifecycle. Skipped when Supabase is not running.
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

const article = (title: string, extra: Record<string, unknown> = {}) => ({
  title: `RLS medium ${title} ${RUN}`,
  url: `https://medium.com/@smartmind/${title}-${RUN}`,
  ...extra,
});

describe.skipIf(!enabled)('Row Level Security: medium_articles', () => {
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

  beforeAll(async () => {
    service = createClient(url!, serviceKey!, opts);
    anon = createClient(url!, anonKey!, opts);
    admin = await makeUser(`rls-medium-admin-${RUN}@example.test`, 'admin');
    member = await makeUser(`rls-medium-member-${RUN}@example.test`, null);
    const { error } = await service
      .from('medium_articles')
      .insert([article('shown', { visible: true }), article('hidden', { visible: false })]);
    if (error) throw error;
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('medium_articles').delete().like('title', `RLS medium %${RUN}`);
    for (const id of userIds) await service.auth.admin.deleteUser(id);
  });

  const mine = (c: SupabaseClient) =>
    c.from('medium_articles').select('title,visible').like('title', `RLS medium %${RUN}`);

  it('shows visitors only visible articles', async () => {
    const { data, error } = await mine(anon);
    expect(error).toBeNull();
    expect((data ?? []).map((r) => r.title)).toEqual([`RLS medium shown ${RUN}`]);
  });

  it('shows a signed-in non-admin only visible articles', async () => {
    const { data } = await mine(member);
    expect((data ?? []).map((r) => r.visible)).toEqual([true]);
  });

  it('refuses writes from visitors', async () => {
    const { error } = await anon.from('medium_articles').insert(article('anon'));
    expect(error).not.toBeNull();
  });

  it('refuses writes from a signed-in non-admin', async () => {
    const ins = await member.from('medium_articles').insert(article('member'));
    expect(ins.error).not.toBeNull();
    await member
      .from('medium_articles')
      .update({ title: 'hacked' })
      .eq('title', `RLS medium shown ${RUN}`);
    await member.from('medium_articles').delete().eq('title', `RLS medium shown ${RUN}`);
    const { data } = await service
      .from('medium_articles')
      .select('title')
      .eq('title', `RLS medium shown ${RUN}`);
    expect(data).toHaveLength(1);
  });

  it('lets an admin see everything and run the full lifecycle', async () => {
    const all = await mine(admin);
    expect(all.data).toHaveLength(2);
    const ins = await admin
      .from('medium_articles')
      .insert(article('by-admin'))
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    const upd = await admin
      .from('medium_articles')
      .update({ visible: false })
      .eq('id', ins.data!.id)
      .select('visible')
      .single();
    expect(upd.data?.visible).toBe(false);
    const del = await admin.from('medium_articles').delete().eq('id', ins.data!.id);
    expect(del.error).toBeNull();
  });

  it('rejects a link that is not https', async () => {
    const { error } = await service
      .from('medium_articles')
      .insert(article('bad', { url: 'javascript:alert(1)' }));
    expect(error).not.toBeNull();
  });
});
