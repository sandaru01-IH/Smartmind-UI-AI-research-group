/**
 * The exact column lists the public blog pages ask for, run as an anonymous visitor against the local
 * Supabase stack. Proves the embedded author and comment count resolve (a bad relationship hint only
 * shows up against a real database) and that hidden posts stay out. Skipped when Supabase is not running.
 */
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BLOG_LIST_COLUMNS,
  BLOG_POST_COLUMNS,
  parseBlogPost,
  parseBlogSummaries,
} from '@/lib/blog/rows';

config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(url && anonKey && serviceKey);

const opts = { auth: { persistSession: false, autoRefreshToken: false } } as const;
const RUN = Math.random().toString(36).slice(2, 8);
const slug = (tag: string) => `rls-reads-${tag}-${RUN}`;

describe.skipIf(!enabled)('public blog reads', () => {
  let service: SupabaseClient;
  let anon: SupabaseClient;
  let userId = '';
  let liveId = '';

  beforeAll(async () => {
    service = createClient(url!, serviceKey!, opts);
    anon = createClient(url!, anonKey!, opts);
    const { data, error } = await service.auth.admin.createUser({
      email: `rls-reads-${RUN}@example.test`,
      password: 'Rls-Test-Password-1!',
      email_confirm: true,
      user_metadata: { display_name: 'Reads Writer' },
    });
    if (error || !data.user) throw error ?? new Error('createUser failed');
    userId = data.user.id;
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const base = {
      author_id: userId,
      summary: 'S',
      body_md: 'word '.repeat(300),
      status: 'published',
      published_at: past,
      hidden: false,
    };
    const { data: rows, error: pe } = await service
      .from('blog_posts')
      .insert([
        { ...base, title: 'RLS reads live', slug: slug('live') },
        { ...base, title: 'RLS reads hidden', slug: slug('hidden'), hidden: true },
        {
          ...base,
          title: 'RLS reads draft',
          slug: slug('draft'),
          status: 'draft',
          published_at: null,
        },
      ])
      .select('id,slug');
    if (pe) throw pe;
    liveId = rows!.find((r) => r.slug === slug('live'))!.id;
    const { error: ce } = await service.from('blog_comments').insert([
      { post_id: liveId, author_id: userId, body: 'First' },
      { post_id: liveId, author_id: userId, body: 'Second' },
    ]);
    if (ce) throw ce;
  });

  afterAll(async () => {
    if (!service) return;
    await service.from('blog_posts').delete().like('slug', `rls-reads-%-${RUN}`);
    if (userId) await service.auth.admin.deleteUser(userId);
  });

  it('lists live posts with their author and comment count, and nothing hidden or draft', async () => {
    const { data, error } = await anon
      .from('blog_posts')
      .select(BLOG_LIST_COLUMNS)
      .like('slug', `rls-reads-%-${RUN}`);
    expect(error).toBeNull();
    const posts = parseBlogSummaries(data);
    expect(posts.map((p) => p.slug)).toEqual([slug('live')]);
    expect(posts[0].author?.displayName).toBe('Reads Writer');
    expect(posts[0].commentCount).toBe(2);
  });

  it('loads one post with its body and reading time', async () => {
    const { data, error } = await anon
      .from('blog_posts')
      .select(BLOG_POST_COLUMNS)
      .eq('slug', slug('live'))
      .maybeSingle();
    expect(error).toBeNull();
    const post = parseBlogPost(data);
    expect(post?.title).toBe('RLS reads live');
    expect(post?.readingMinutes).toBe(2);
  });

  it('finds nothing for a hidden or draft post by slug', async () => {
    for (const tag of ['hidden', 'draft']) {
      const { data } = await anon
        .from('blog_posts')
        .select(BLOG_POST_COLUMNS)
        .eq('slug', slug(tag))
        .maybeSingle();
      expect(data, tag).toBeNull();
    }
  });
});
