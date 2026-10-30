/**
 * Row Level Security for the community blog, against the local Supabase stack (`npx supabase start`).
 * Proves: a self-registered account never becomes an admin or sees admin data; only verified,
 * unblocked members write; writers cannot touch moderation flags; the admin can only hide and block;
 * hidden and blocked content disappears from the public; accounts can be deleted. Skipped when
 * Supabase is not running.
 */
import { execFileSync } from 'node:child_process';
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
const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_Smartmmind';

/** Runs SQL inside the local database container, for things the API cannot do (un-confirming an email). */
function sql(query: string): void {
  execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-c', query], {
    stdio: 'pipe',
  });
}
const hasDocker = (() => {
  try {
    execFileSync('docker', ['exec', DB_CONTAINER, 'true'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

const past = () => new Date(Date.now() - 3_600_000).toISOString();
const postOf = (authorId: string, tag: string, extra: Record<string, unknown> = {}) => ({
  author_id: authorId,
  title: `RLS blog ${tag} ${RUN}`,
  slug: `rls-blog-${tag}-${RUN}`,
  summary: 'Summary',
  body_md: 'Body',
  status: 'published',
  published_at: past(),
  ...extra,
});

describe.skipIf(!enabled)('Row Level Security: community blog', () => {
  let service: SupabaseClient;
  let anon: SupabaseClient;
  let admin: SupabaseClient;
  let alice: SupabaseClient; // verified writer
  let bob: SupabaseClient; // verified reader and commenter
  let carol: SupabaseClient; // will be blocked
  let dave: SupabaseClient; // email gets un-confirmed after sign-in
  const ids: Record<string, string> = {};
  const userIds: string[] = [];

  async function makeUser(name: string, role: 'admin' | null = null): Promise<SupabaseClient> {
    const email = `rls-${name}-${RUN}@example.test`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `Rls ${name}` },
    });
    if (error || !data.user) throw error ?? new Error('createUser failed');
    ids[name] = data.user.id;
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

  const mineByTag = (c: SupabaseClient, tag: string) =>
    c.from('blog_posts').select('id,hidden,title').eq('slug', `rls-blog-${tag}-${RUN}`);

  beforeAll(async () => {
    service = createClient(url!, serviceKey!, opts);
    anon = createClient(url!, anonKey!, opts);
    admin = await makeUser('admin', 'admin');
    alice = await makeUser('alice');
    bob = await makeUser('bob');
    carol = await makeUser('carol');
    dave = await makeUser('dave');
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('blog_posts').delete().like('slug', `rls-blog-%-${RUN}`);
    for (const id of userIds) await service.auth.admin.deleteUser(id);
  });

  it('gives a new account a member profile and never an admin profile', async () => {
    const { data: member } = await service
      .from('member_profiles')
      .select('display_name,blocked')
      .eq('id', ids.alice)
      .single();
    expect(member).toEqual({ display_name: 'Rls alice', blocked: false });
    const { data: adminRow } = await service.from('profiles').select('id').eq('id', ids.alice);
    expect(adminRow).toEqual([]);
  });

  it('keeps ordinary accounts out of admin data and admin functions', async () => {
    expect((await alice.from('profiles').select('*')).data ?? []).toEqual([]);
    for (const [fn, args] of [
      ['admin_set_blog_post_hidden', { p_id: ids.alice, p_hidden: true }],
      ['admin_set_blog_comment_hidden', { p_id: ids.alice, p_hidden: true }],
      ['admin_set_member_blocked', { p_id: ids.bob, p_blocked: true }],
    ] as const) {
      const { error } = await alice.rpc(fn, args);
      expect(error, fn).not.toBeNull();
      expect((await anon.rpc(fn, args)).error, `${fn} as visitor`).not.toBeNull();
    }
    expect(
      (await alice.from('profiles').insert({ id: ids.alice, role: 'admin' })).error,
    ).not.toBeNull();
    const { data } = await service
      .from('member_profiles')
      .select('blocked')
      .eq('id', ids.bob)
      .single();
    expect(data?.blocked).toBe(false);
  });

  it('lets only an admin list members with their email addresses', async () => {
    const asAdmin = await admin.rpc('admin_list_members');
    expect(asAdmin.error).toBeNull();
    const mine = (
      asAdmin.data as { id: string; email: string; display_name: string; blocked: boolean }[]
    ).find((m) => m.id === ids.alice);
    expect(mine).toMatchObject({
      email: `rls-alice-${RUN}@example.test`,
      display_name: 'Rls alice',
      blocked: false,
    });
    expect((await alice.rpc('admin_list_members')).error).not.toBeNull();
    expect((await anon.rpc('admin_list_members')).error).not.toBeNull();
  });

  it('lets a verified member publish, and the public read it', async () => {
    const ins = await alice
      .from('blog_posts')
      .insert(postOf(ids.alice, 'live'))
      .select('id')
      .single();
    expect(ins.error).toBeNull();
    expect((await mineByTag(anon, 'live')).data).toHaveLength(1);
    expect((await alice.from('blog_posts').insert(postOf(ids.bob, 'forged'))).error).not.toBeNull();
  });

  it('hides drafts from everyone but the author and the admin', async () => {
    await alice
      .from('blog_posts')
      .insert(postOf(ids.alice, 'draft', { status: 'draft', published_at: null }));
    expect((await mineByTag(anon, 'draft')).data).toEqual([]);
    expect((await mineByTag(bob, 'draft')).data).toEqual([]);
    expect((await mineByTag(alice, 'draft')).data).toHaveLength(1);
    expect((await mineByTag(admin, 'draft')).data).toHaveLength(1);
  });

  it('rejects a writer changing moderation flags, the counter or the author', async () => {
    const own = (patch: Record<string, unknown>) =>
      alice.from('blog_posts').update(patch).eq('slug', `rls-blog-live-${RUN}`);
    expect((await own({ hidden: true })).error).not.toBeNull();
    expect((await own({ like_count: 99 })).error).not.toBeNull();
    expect((await own({ author_id: ids.bob })).error).not.toBeNull();
    expect((await own({ title: `RLS blog live ${RUN} edited` })).error).toBeNull();
    const { data } = await service
      .from('blog_posts')
      .select('hidden,like_count,author_id')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    expect(data).toEqual({ hidden: false, like_count: 0, author_id: ids.alice });
  });

  it('stops other members editing or deleting a post', async () => {
    await bob.from('blog_posts').update({ title: 'hacked' }).eq('slug', `rls-blog-live-${RUN}`);
    await bob.from('blog_posts').delete().eq('slug', `rls-blog-live-${RUN}`);
    const { data } = await service
      .from('blog_posts')
      .select('title')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    expect(data?.title).toBe(`RLS blog live ${RUN} edited`);
  });

  it('refuses a signed-out visitor everything', async () => {
    expect((await anon.from('blog_posts').insert(postOf(ids.alice, 'anon'))).error).not.toBeNull();
    const { data: post } = await service
      .from('blog_posts')
      .select('id')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    expect(
      (await anon.from('blog_comments').insert({ post_id: post!.id, body: 'hi' })).error,
    ).not.toBeNull();
    expect(
      (await anon.from('blog_likes').insert({ post_id: post!.id, user_id: ids.alice })).error,
    ).not.toBeNull();
  });

  it('counts a like once, and removes it again', async () => {
    const { data: post } = await service
      .from('blog_posts')
      .select('id')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    const like = () => bob.from('blog_likes').insert({ post_id: post!.id, user_id: ids.bob });
    expect((await like()).error).toBeNull();
    expect((await like()).error).not.toBeNull();
    const count = async () =>
      (await service.from('blog_posts').select('like_count').eq('id', post!.id).single()).data
        ?.like_count;
    expect(await count()).toBe(1);
    expect(
      (await bob.from('blog_likes').delete().eq('post_id', post!.id).eq('user_id', ids.bob)).error,
    ).toBeNull();
    expect(await count()).toBe(0);
    expect(
      (await bob.from('blog_likes').insert({ post_id: post!.id, user_id: ids.alice })).error,
    ).not.toBeNull();
  });

  it('lets members comment, and lets the post author delete a comment on their post', async () => {
    const { data: post } = await service
      .from('blog_posts')
      .select('id')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    const c = await bob
      .from('blog_comments')
      .insert({ post_id: post!.id, author_id: ids.bob, body: 'Nice' })
      .select('id')
      .single();
    expect(c.error).toBeNull();
    expect((await anon.from('blog_comments').select('id').eq('id', c.data!.id)).data).toHaveLength(
      1,
    );
    expect((await carol.from('blog_comments').delete().eq('id', c.data!.id)).error).toBeNull();
    expect(
      (await service.from('blog_comments').select('id').eq('id', c.data!.id)).data,
    ).toHaveLength(1);
    expect((await alice.from('blog_comments').delete().eq('id', c.data!.id)).error).toBeNull();
    expect((await service.from('blog_comments').select('id').eq('id', c.data!.id)).data).toEqual(
      [],
    );
  });

  it('lets the admin hide a post and a comment, but not edit them', async () => {
    const { data: post } = await service
      .from('blog_posts')
      .select('id')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    const c = await bob
      .from('blog_comments')
      .insert({ post_id: post!.id, author_id: ids.bob, body: 'Visible' })
      .select('id')
      .single();
    expect(
      (await admin.rpc('admin_set_blog_comment_hidden', { p_id: c.data!.id, p_hidden: true }))
        .error,
    ).toBeNull();
    expect((await anon.from('blog_comments').select('id').eq('id', c.data!.id)).data).toEqual([]);

    expect(
      (await admin.rpc('admin_set_blog_post_hidden', { p_id: post!.id, p_hidden: true })).error,
    ).toBeNull();
    expect((await mineByTag(anon, 'live')).data).toEqual([]);
    const own = await mineByTag(alice, 'live');
    expect(own.data?.[0].hidden).toBe(true);

    await admin.from('blog_posts').update({ title: 'edited by admin' }).eq('id', post!.id);
    await admin.from('blog_posts').delete().eq('id', post!.id);
    const { data } = await service.from('blog_posts').select('title').eq('id', post!.id).single();
    expect(data?.title).toBe(`RLS blog live ${RUN} edited`);

    expect(
      (await admin.rpc('admin_set_blog_post_hidden', { p_id: post!.id, p_hidden: false })).error,
    ).toBeNull();
    expect((await mineByTag(anon, 'live')).data).toHaveLength(1);
  });

  it('removes a blocked member’s content from the public and stops them writing', async () => {
    await carol.from('blog_posts').insert(postOf(ids.carol, 'carol'));
    expect((await mineByTag(anon, 'carol')).data).toHaveLength(1);
    expect(
      (await admin.rpc('admin_set_member_blocked', { p_id: ids.carol, p_blocked: true })).error,
    ).toBeNull();
    expect((await mineByTag(anon, 'carol')).data).toEqual([]);
    expect((await anon.from('member_profiles').select('id').eq('id', ids.carol)).data).toEqual([]);
    expect(
      (await carol.from('blog_posts').insert(postOf(ids.carol, 'carol2'))).error,
    ).not.toBeNull();
    expect(
      (
        await carol
          .from('blog_posts')
          .update({ title: 'still here' })
          .eq('slug', `rls-blog-carol-${RUN}`)
      ).error,
    ).toBeNull();
    const { data } = await service
      .from('blog_posts')
      .select('title')
      .eq('slug', `rls-blog-carol-${RUN}`)
      .single();
    expect(data?.title).toBe(`RLS blog carol ${RUN}`);
    await admin.rpc('admin_set_member_blocked', { p_id: ids.carol, p_blocked: false });
    expect((await mineByTag(anon, 'carol')).data).toHaveLength(1);
  });

  it.skipIf(!hasDocker)('refuses a member whose email is not confirmed', async () => {
    sql(`update auth.users set email_confirmed_at = null where id = '${ids.dave}'`);
    expect((await dave.from('blog_posts').insert(postOf(ids.dave, 'dave'))).error).not.toBeNull();
    sql(`update auth.users set email_confirmed_at = now() where id = '${ids.dave}'`);
    expect((await dave.from('blog_posts').insert(postOf(ids.dave, 'dave'))).error).toBeNull();
  });

  it('limits a member to ten posts and thirty comments an hour', async () => {
    const eve = await makeUser('eve');
    let failedAt = 0;
    for (let i = 1; i <= 11; i++) {
      const { error } = await eve
        .from('blog_posts')
        .insert(postOf(ids.eve, `eve${i}`, { status: 'draft', published_at: null }));
      if (error && !failedAt) failedAt = i;
    }
    expect(failedAt).toBe(11);
    const { data: post } = await service
      .from('blog_posts')
      .select('id')
      .eq('slug', `rls-blog-live-${RUN}`)
      .single();
    let failedComment = 0;
    for (let i = 1; i <= 31; i++) {
      const { error } = await eve
        .from('blog_comments')
        .insert({ post_id: post!.id, author_id: ids.eve, body: `c${i}` });
      if (error && !failedComment) failedComment = i;
    }
    expect(failedComment).toBe(31);
  });

  it('keeps a member’s writing, as "Former member", when they delete their account', async () => {
    const frank = await makeUser('frank');
    await frank.from('blog_posts').insert(postOf(ids.frank, 'frank'));
    expect((await frank.rpc('delete_my_account')).error).toBeNull();
    userIds.splice(userIds.indexOf(ids.frank), 1);
    const { data } = await anon
      .from('blog_posts')
      .select('author_id,title')
      .eq('slug', `rls-blog-frank-${RUN}`);
    expect(data).toEqual([{ author_id: null, title: `RLS blog frank ${RUN}` }]);
    expect((await service.from('member_profiles').select('id').eq('id', ids.frank)).data).toEqual(
      [],
    );
  });

  it('never lets an admin account delete itself through the member function', async () => {
    expect((await admin.rpc('delete_my_account')).error).not.toBeNull();
    expect((await service.from('profiles').select('id').eq('id', ids.admin)).data).toHaveLength(1);
  });

  it('stops a member uploading into another member’s folder', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const opts2 = { contentType: 'image/png' };
    const own = await alice.storage
      .from('media')
      .upload(`members/${ids.alice}/${RUN}.png`, png, opts2);
    expect(own.error).toBeNull();
    const other = await alice.storage
      .from('media')
      .upload(`members/${ids.bob}/${RUN}.png`, png, opts2);
    expect(other.error).not.toBeNull();
    const elsewhere = await alice.storage
      .from('media')
      .upload(`covers/2026/${RUN}.png`, png, opts2);
    expect(elsewhere.error).not.toBeNull();
    await service.storage.from('media').remove([`members/${ids.alice}/${RUN}.png`]);
  });
});
