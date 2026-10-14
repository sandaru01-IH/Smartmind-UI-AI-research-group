/**
 * Row Level Security tests against the local Supabase stack (`npx supabase start`).
 * Proves: anonymous users read only live posts and write nothing; a signed-in non-admin cannot
 * write; an admin can run the full lifecycle. Skipped when Supabase is not running.
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

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const post = (slug: string, extra: Record<string, unknown> = {}) => ({
  type: 'article',
  title: `RLS test ${slug}`,
  slug,
  category: 'News',
  status: 'draft',
  ...extra,
});

describe.skipIf(!enabled)('Row Level Security', () => {
  let service: SupabaseClient;
  let anon: SupabaseClient;
  let admin: SupabaseClient;
  let member: SupabaseClient;
  const userIds: string[] = [];
  const slugs = {
    draft: `rls-draft-${RUN}`,
    live: `rls-live-${RUN}`,
    future: `rls-future-${RUN}`,
    life: `rls-life-${RUN}`,
  };
  const uploaded: string[] = [];

  async function makeUser(email: string, role: 'admin' | null): Promise<SupabaseClient> {
    const { data, error } = await service.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
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
    admin = await makeUser(`rls-admin-${RUN}@example.test`, 'admin');
    member = await makeUser(`rls-member-${RUN}@example.test`, null);

    const past = new Date(Date.now() - 3_600_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const { error } = await service.from('posts').insert([
      post(slugs.draft, { status: 'draft' }),
      post(slugs.live, { status: 'published', published_at: past }),
      post(slugs.future, { status: 'published', published_at: future }),
    ]);
    if (error) throw error;
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('posts').delete().in('slug', Object.values(slugs));
    if (uploaded.length) await service.storage.from('media').remove(uploaded);
    for (const id of userIds) await service.auth.admin.deleteUser(id);
  });

  describe('anonymous visitor', () => {
    it('sees live posts only', async () => {
      const { data, error } = await anon.from('posts').select('slug').in('slug', Object.values(slugs));
      expect(error).toBeNull();
      expect((data ?? []).map((r) => r.slug)).toEqual([slugs.live]);
    });
    it('cannot read a draft by slug', async () => {
      const { data } = await anon.from('posts').select('*').eq('slug', slugs.draft);
      expect(data).toEqual([]);
    });
    it('cannot read a scheduled post', async () => {
      const { data } = await anon.from('posts').select('*').eq('slug', slugs.future);
      expect(data).toEqual([]);
    });
    it('cannot insert', async () => {
      const { error } = await anon.from('posts').insert(post(`rls-anon-${RUN}`));
      expect(error).not.toBeNull();
    });
    it('cannot update or delete a live post', async () => {
      await anon.from('posts').update({ title: 'hacked' }).eq('slug', slugs.live);
      await anon.from('posts').delete().eq('slug', slugs.live);
      const { data } = await service.from('posts').select('title').eq('slug', slugs.live).single();
      expect(data?.title).toBe(`RLS test ${slugs.live}`);
    });
    it('cannot read profiles', async () => {
      const { data } = await anon.from('profiles').select('*');
      expect(data ?? []).toEqual([]);
    });
    it('cannot upload to the media bucket', async () => {
      const { error } = await anon.storage.from('media').upload(`covers/anon-${RUN}.png`, PNG, { contentType: 'image/png' });
      expect(error).not.toBeNull();
    });
  });

  describe('signed-in non-admin', () => {
    it('still sees live posts only', async () => {
      const { data } = await member.from('posts').select('slug').in('slug', Object.values(slugs));
      expect((data ?? []).map((r) => r.slug)).toEqual([slugs.live]);
    });
    it('cannot insert', async () => {
      const { error } = await member.from('posts').insert(post(`rls-member-${RUN}`));
      expect(error).not.toBeNull();
    });
    it('cannot update or delete', async () => {
      await member.from('posts').update({ title: 'hacked' }).eq('slug', slugs.live);
      await member.from('posts').delete().eq('slug', slugs.live);
      const { data } = await service.from('posts').select('title').eq('slug', slugs.live).single();
      expect(data?.title).toBe(`RLS test ${slugs.live}`);
    });
    it('cannot promote themselves to admin', async () => {
      const { data: who } = await member.auth.getUser();
      await member.from('profiles').insert({ id: who.user!.id, role: 'admin' });
      const { data } = await service.from('profiles').select('role').eq('id', who.user!.id);
      expect(data).toEqual([]);
    });
    it('cannot upload to the media bucket', async () => {
      const { error } = await member.storage.from('media').upload(`covers/member-${RUN}.png`, PNG, { contentType: 'image/png' });
      expect(error).not.toBeNull();
    });
  });

  describe('admin', () => {
    it('sees drafts and scheduled posts', async () => {
      const { data } = await admin.from('posts').select('slug').in('slug', Object.values(slugs));
      expect((data ?? []).map((r) => r.slug).sort()).toEqual([slugs.draft, slugs.future, slugs.live].sort());
    });

    it('runs the full lifecycle: draft, publish, edit, unpublish, delete', async () => {
      const created = await admin.from('posts').insert(post(slugs.life)).select().single();
      expect(created.error).toBeNull();
      const id = created.data!.id as string;

      // A new draft is invisible to visitors.
      expect((await anon.from('posts').select('id').eq('id', id)).data).toEqual([]);

      // Publish: visible.
      const publish = await admin.from('posts').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id).select().single();
      expect(publish.error).toBeNull();
      expect((await anon.from('posts').select('id').eq('id', id)).data).toHaveLength(1);

      // Edit.
      const edit = await admin.from('posts').update({ title: 'Edited by admin' }).eq('id', id).select().single();
      expect(edit.data?.title).toBe('Edited by admin');
      expect((await anon.from('posts').select('title').eq('id', id).single()).data?.title).toBe('Edited by admin');

      // Unpublish: hidden again.
      await admin.from('posts').update({ status: 'draft' }).eq('id', id);
      expect((await anon.from('posts').select('id').eq('id', id)).data).toEqual([]);

      // Delete.
      const del = await admin.from('posts').delete().eq('id', id);
      expect(del.error).toBeNull();
      expect((await service.from('posts').select('id').eq('id', id)).data).toEqual([]);
    });

    it('enforces data constraints in the database', async () => {
      const noAlt = await admin.from('posts').insert(post(`rls-noalt-${RUN}`, { cover_path: 'covers/2026/x.png' }));
      expect(noAlt.error).not.toBeNull();
      const longUpdate = await admin.from('posts').insert(post(`rls-long-${RUN}`, { type: 'update', title: 'x'.repeat(141) }));
      expect(longUpdate.error).not.toBeNull();
      const badLink = await admin.from('posts').insert(post(`rls-link-${RUN}`, { link_url: 'javascript:alert(1)' }));
      expect(badLink.error).not.toBeNull();
      const noDate = await admin.from('posts').insert(post(`rls-nodate-${RUN}`, { status: 'published' }));
      expect(noDate.error).not.toBeNull();
    });

    it('can upload and delete media, and the public can read it', async () => {
      const path = `covers/2026/rls-${RUN}.png`;
      const up = await admin.storage.from('media').upload(path, PNG, { contentType: 'image/png' });
      expect(up.error).toBeNull();
      uploaded.push(path);
      const publicUrl = admin.storage.from('media').getPublicUrl(path).data.publicUrl;
      const res = await fetch(publicUrl);
      expect(res.status).toBe(200);
      const del = await admin.storage.from('media').remove([path]);
      expect(del.error).toBeNull();
    });

    it('is rejected by the bucket for disallowed types', async () => {
      const path = `covers/2026/rls-${RUN}.html`;
      const up = await admin.storage.from('media').upload(path, new TextEncoder().encode('<script>1</script>'), { contentType: 'text/html' });
      expect(up.error).not.toBeNull();
    });
  });
});
