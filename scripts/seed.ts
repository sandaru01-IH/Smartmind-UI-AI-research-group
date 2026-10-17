/**
 * Loads the seed posts from content/seed-posts.ts into Supabase. Safe to re-run: rows are matched by slug.
 *   npm run seed
 * Seed items that this.md flags as unconfirmed are drafts tagged `to-be-confirmed`.
 */
import { SEED_POSTS } from '../content/seed-posts';
import {
  MILESTONE_POST_SLUG,
  seedAwards,
  seedMilestones,
  seedPartners,
  seedPublications,
  seedResearch,
  seedSpotlights,
} from '../lib/catalog/seed';
import { seedNetwork } from '../lib/team/seed';
import { serviceClient } from './_env';

type Db = ReturnType<typeof serviceClient>;

const isEmpty = async (db: Db, table: string): Promise<boolean> => {
  const r = await db.from(table).select('id', { count: 'exact', head: true });
  if (r.error) throw r.error;
  return (r.count ?? 0) === 0;
};

/** Awards, publications, partners and research themes, each only while its table is still empty. */
/** `--only=partners,research,journey` limits the run to those sections and skips posts and team. */
const ONLY = process.argv
  .find((a) => a.startsWith('--only='))
  ?.slice(7)
  .split(',');
const wants = (...names: string[]) => !ONLY || names.some((n) => ONLY.includes(n));

async function seedCatalog(db: Db) {
  const { data: people, error } = await db.from('team_members').select('id,name');
  if (error) throw error;
  // Link an award to the team members whose names appear in its "awarded to" text.
  const peopleIn = (text: string) =>
    (people ?? [])
      .filter((p) => text.toLowerCase().includes(p.name.toLowerCase()))
      .map((p) => p.id);

  if (wants('awards') && (await isEmpty(db, 'awards'))) {
    for (const { id: _id, people: _p, href: _h, ...row } of seedAwards()) {
      void [_id, _p, _h];
      const res = await db.from('awards').insert(row).select('id').single();
      if (res.error) throw res.error;
      const links = peopleIn(row.who).map((member_id) => ({ member_id, award_id: res.data.id }));
      if (links.length) {
        const l = await db.from('work_people').insert(links);
        if (l.error) throw l.error;
      }
    }
    console.log('Seeded awards.');
  }
  if (wants('publications') && (await isEmpty(db, 'publications'))) {
    const rows = seedPublications().map(
      ({ id: _id, people: _p, fromPost: _f, ...row }) => (void [_id, _p, _f], row),
    );
    const res = await db.from('publications').insert(rows);
    if (res.error) throw res.error;
    console.log('Seeded publications.');
  }
  if (wants('partners') && (await isEmpty(db, 'partners'))) {
    const rows = seedPartners().map(({ id: _id, ...row }) => (void _id, row));
    const res = await db.from('partners').insert(rows);
    if (res.error) throw res.error;
    console.log('Seeded partners.');
  }
  if (wants('research') && (await isEmpty(db, 'research_spotlights'))) {
    const rows = seedSpotlights().map(({ id: _id, ...row }) => (void [_id], row));
    const res = await db.from('research_spotlights').insert(rows);
    if (res.error) throw res.error;
    console.log('Seeded spotlight projects.');
  }
  if (wants('journey') && (await isEmpty(db, 'milestones'))) {
    // Tie each starter entry to its news post, so the post's "to be confirmed" switch drives it.
    const posts = await db
      .from('posts')
      .select('id,slug')
      .in('slug', Object.values(MILESTONE_POST_SLUG));
    if (posts.error) throw posts.error;
    const idBySlug = new Map((posts.data ?? []).map((p) => [p.slug as string, p.id as string]));
    const rows = seedMilestones().map((m) => ({
      year: m.year,
      when_label: m.when_label,
      title: m.title,
      detail: m.detail,
      links: m.links,
      tbc: m.own_tbc,
      post_id: idBySlug.get(MILESTONE_POST_SLUG[m.seedId] ?? '') ?? null,
      sort_order: m.sort_order,
    }));
    const res = await db.from('milestones').insert(rows);
    if (res.error) throw res.error;
    console.log('Seeded the journey timeline.');
  }
  if (wants('research') && (await isEmpty(db, 'research_themes'))) {
    const seed = seedResearch();
    for (const t of seed.themes) {
      const res = await db
        .from('research_themes')
        .insert({ title: t.title, style: t.style, sort_order: t.sort_order })
        .select('id')
        .single();
      if (res.error) throw res.error;
      const projects = t.projects.map((p) => ({
        theme_id: res.data.id,
        title: p.title,
        src_funded: p.src_funded,
        sort_order: p.sort_order,
      }));
      const ins = await db.from('research_projects').insert(projects);
      if (ins.error) throw ins.error;
    }
    if (await isEmpty(db, 'research_topics')) {
      const ins = await db
        .from('research_topics')
        .insert(seed.topics.map(({ title, sort_order }) => ({ title, sort_order })));
      if (ins.error) throw ins.error;
    }
    console.log('Seeded research themes.');
  }
}

async function main() {
  const db = serviceClient();
  if (ONLY) {
    await seedCatalog(db);
    return;
  }
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
      const { id: _id, works: _works, ...row } = m;
      void [_id, _works];
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
  await seedCatalog(db);
  console.log(
    `Seeded ${SEED_POSTS.length} posts (${live} published, ${SEED_POSTS.length - live} drafts).`,
  );
}

main().catch((e) => {
  console.error('seed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
