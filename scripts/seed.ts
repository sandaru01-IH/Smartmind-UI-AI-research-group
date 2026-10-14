/**
 * Loads the seed posts from content/seed-posts.ts into Supabase. Safe to re-run: rows are matched by slug.
 *   npm run seed
 * Seed items that this.md flags as unconfirmed are drafts tagged `to-be-confirmed`.
 */
import { SEED_POSTS } from '../content/seed-posts';
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
  console.log(
    `Seeded ${SEED_POSTS.length} posts (${live} published, ${SEED_POSTS.length - live} drafts).`,
  );
}

main().catch((e) => {
  console.error('seed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
