/**
 * Loads the seed posts from content/seed-posts.ts into Supabase. Safe to re-run: rows are matched by slug.
 *   npm run seed
 * Seed items that this.md flags as unconfirmed are drafts tagged `to-be-confirmed`.
 */
import { SEED_POSTS } from '../content/seed-posts';
import { seedNetwork } from '../lib/team/seed';
import { serviceClient } from './_env';

async function main() {
  const db = serviceClient();
  // The database assigns ids, and seed posts have no author.
  const rows = SEED_POSTS.map((p) =>
    Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'id' && k !== 'author_id')),
  );
  const { error } = await db.from('posts').upsert(rows, { onConflict: 'slug' });
  if (error) throw error;
  const live = SEED_POSTS.filter((p) => p.status === 'published').length;

  // The starter team and its connections, only while the team is still empty.
  const existing = await db.from('team_members').select('id', { count: 'exact', head: true });
  if (existing.error) throw existing.error;
  if ((existing.count ?? 0) === 0) {
    const net = seedNetwork();
    const ids = new Map<string, string>();
    for (const m of net.members) {
      const { id: _id, ...row } = m;
      void _id;
      const res = await db.from('team_members').insert(row).select('id').single();
      if (res.error) throw res.error;
      ids.set(m.id, res.data.id);
    }
    const links = net.links.flatMap((l) => {
      const a = ids.get(l.a);
      const b = ids.get(l.b);
      return a && b ? [{ a, b, label: l.label }] : [];
    });
    const res = await db.from('team_links').insert(links);
    if (res.error) throw res.error;
    console.log(`Seeded ${net.members.length} team members and ${links.length} connections.`);
  }
  console.log(
    `Seeded ${SEED_POSTS.length} posts (${live} published, ${SEED_POSTS.length - live} drafts).`,
  );
}

main().catch((e) => {
  console.error('seed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
