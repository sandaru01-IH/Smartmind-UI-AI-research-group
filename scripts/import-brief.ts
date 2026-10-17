/**
 * Adds what the original brief (this.md / "latest data.md") has that the database lacks. Everything is
 * checked against what is already there first, so running it twice changes nothing the second time.
 *   npm run import-brief -- --dry     (report only)
 *   npm run import-brief              (write)
 *
 * The brief's partners, research themes and journey are loaded by `npm run seed -- --only=...`; this covers
 * the rest: missing team members and connections, the first-build news posts, the papers and awards that
 * no post already records, and the ties between journey entries and their posts.
 */
import { SEED_LINKS, TEAM } from '../content/team';
import { SEED_POSTS } from '../content/seed-posts';
import { ALL_PUBLICATIONS } from '../content/publications';
import { MILESTONE_POST_SLUG } from '../lib/catalog/seed';
import { serviceClient } from './_env';

const dry = process.argv.includes('--dry');
const db = serviceClient();
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};
const log = (what: string, n: number, extra = '') =>
  console.log(`${what}: ${n}${extra ? ` ${extra}` : ''}`);

/** Awards the brief lists that no existing post records. The rest were matched to a post and skipped. */
const AWARDS = [
  {
    key: 'icsd',
    year: 2025,
    when_label: 'May 2025',
    award: 'Best Scientific Paper',
    who: 'Sandaruwan Sankalpa Silva and team',
    event: 'The Colombo Conference 2025 (ICSD-2025), Colombo',
    reason: 'For the NBRO disaster chatbot paper',
    tbc: true,
    people: ['sandaruwan-sankalpa-silva'],
  },
  {
    key: 'r4tli24',
    year: 2024,
    when_label: '2024',
    award: 'Best Paper, Transport Planning category',
    who: 'Harini Sawandi',
    event:
      '9th International Conference on Research for Transport and Logistics Industry (R4TLI 2024)',
    reason: 'For a GeoAI walking-behaviour study',
    tbc: true,
    people: ['harini-sawandi'],
  },
  {
    key: 'wcise-env',
    year: 2019,
    when_label: 'December 2019',
    award: 'Best Researcher in Environment Science',
    who: 'Chethika Abenayake',
    event: 'WCISE19, Bangkok',
    reason: '',
    tbc: false,
    people: ['chethika-abenayake'],
  },
  {
    key: 'foss4g',
    year: 2018,
    when_label: '2018',
    award: 'Best Paper, academic track (student)',
    who: 'Vajeeha',
    event: 'FOSS4G Asia 2018, Moratuwa',
    reason: '',
    tbc: false,
    people: [],
  },
];

/** Papers from the brief, by title. A paper counts as present when any post or publication has the same title. */
const WANT_PAPERS: Record<string, string[]> = {
  'accessibility assessment of cities based on network analysis and centrality': [],
  'a participatory chatbot for strengthening urban flood and landslide resilience': [
    'harini-sawandi',
    'sachin-mamoru',
    'amila-jayasinghe',
    'choolaka-hewawasam',
    'jasintha-jayasanka',
    'buddhika-amila-kumara',
    'pradeep-kalansooriya',
  ],
};

/** Who belongs to each first-build news post. */
const POST_PEOPLE: Record<string, string[]> = {
  'participatory-chatbot-flood-landslide-resilience': [
    'harini-sawandi',
    'sachin-mamoru',
    'amila-jayasinghe',
  ],
  'nbro-manchester-landslide-chatbot-meeting': ['amila-jayasinghe'],
  'icsd-2025-best-scientific-paper': ['sandaruwan-sankalpa-silva'],
  'street-cloud-ioer-dresden': [
    'niroshan-sanjaya',
    'sandaruwan-sankalpa-silva',
    'samith-madusanka',
  ],
};

async function main() {
  // --- team members
  const have = must(await db.from('team_members').select('id,slug'));
  const idBySlug = new Map(have.map((m) => [m.slug as string, m.id as string]));
  const GROUP = { core: 'Core', authors: 'Authors', collaborator: 'Collaborator' } as const;
  const newMembers = TEAM.filter((p) => !idBySlug.has(p.slug)).map((p, i) => ({
    slug: p.slug,
    name: p.name,
    role: '',
    group_label: GROUP[p.group],
    affiliation: p.affiliation ?? '',
    education: '',
    qualifications: '',
    contribution: p.appears.join('. '),
    visible: true,
    sort_order: 100 + i,
  }));
  log('team members to add', newMembers.length, newMembers.map((m) => m.name).join(', '));

  // --- posts
  const posts = must(await db.from('posts').select('id,slug,title'));
  const postSlugs = new Set(posts.map((p) => p.slug as string));
  const postTitles = new Set(posts.map((p) => norm(p.title as string)));
  const newPosts = SEED_POSTS.filter(
    (p) => !postSlugs.has(p.slug) && !postTitles.has(norm(p.title)),
  ).map(({ id: _id, author_id: _a, ...p }) => {
    void [_id, _a];
    const date = p.event_date ? `${p.event_date}T09:00:00.000Z` : '2025-05-01T09:00:00.000Z';
    return { ...p, status: 'published' as const, published_at: p.published_at ?? date };
  });
  log('news posts to add', newPosts.length, newPosts.map((p) => p.slug).join(', '));

  // --- publications
  const pubs = must(await db.from('publications').select('title'));
  const known = new Set([...pubs.map((p) => norm(p.title as string)), ...postTitles]);
  const newPubs = ALL_PUBLICATIONS.filter(
    (p) => WANT_PAPERS[norm(p.title)] && !known.has(norm(p.title)),
  );
  log('publications to add', newPubs.length, newPubs.map((p) => p.title.slice(0, 50)).join(' | '));

  // --- awards
  const awards = must(await db.from('awards').select('award,year'));
  const haveAward = new Set(awards.map((a) => `${norm(a.award as string)}|${a.year}`));
  const newAwards = AWARDS.filter((a) => !haveAward.has(`${norm(a.award)}|${a.year}`));
  log('awards to add', newAwards.length, newAwards.map((a) => `${a.award} ${a.year}`).join(' | '));

  // --- sourced connections
  const links = must(await db.from('team_links').select('a,b'));
  const haveLink = new Set(links.map((l) => [l.a, l.b].sort().join('|')));
  if (dry) {
    console.log('(dry run: nothing written)');
    return;
  }

  if (newMembers.length) {
    for (const m of must(await db.from('team_members').insert(newMembers).select('id,slug')))
      idBySlug.set(m.slug as string, m.id as string);
  }
  const person = (slug: string) => idBySlug.get(slug);

  const missingLinks = SEED_LINKS.flatMap((l) => {
    const a = person(l.a);
    const b = person(l.b);
    return a && b && !haveLink.has([a, b].sort().join('|')) ? [{ a, b, label: l.label }] : [];
  });
  if (missingLinks.length) must(await db.from('team_links').insert(missingLinks).select('id'));
  log('connections added', missingLinks.length);

  if (newPosts.length) must(await db.from('posts').insert(newPosts).select('id'));
  const allPosts = must(await db.from('posts').select('id,slug'));
  const postId = new Map(allPosts.map((p) => [p.slug as string, p.id as string]));

  const workRows: Record<string, string>[] = [];
  for (const p of newPosts)
    for (const s of POST_PEOPLE[p.slug] ?? []) {
      const m = person(s);
      if (m) workRows.push({ member_id: m, post_id: postId.get(p.slug)! });
    }

  for (const p of newPubs) {
    const row = must(
      await db
        .from('publications')
        .insert({
          kind: 'paper',
          year: p.year,
          title: p.title,
          venue: p.venue,
          href: p.href ?? null,
          authors: p.authors ?? '',
          tbc: p.confirmation === 'tbc',
          sort_order: 0,
        })
        .select('id')
        .single(),
    );
    for (const s of WANT_PAPERS[norm(p.title)] ?? []) {
      const m = person(s);
      if (m) workRows.push({ member_id: m, publication_id: (row as unknown as { id: string }).id });
    }
  }

  for (const a of newAwards) {
    const { people, key: _k, ...fields } = a;
    void _k;
    const row = must(await db.from('awards').insert(fields).select('id').single());
    for (const s of people) {
      const m = person(s);
      if (m) workRows.push({ member_id: m, award_id: (row as unknown as { id: string }).id });
    }
  }
  for (let i = 0; i < workRows.length; i += 200)
    must(
      await db
        .from('work_people')
        .insert(workRows.slice(i, i + 200))
        .select('member_id'),
    );
  log('people linked to work', workRows.length);

  // --- tie journey entries to their news posts (the database then copies each post's switch)
  const ms = must(await db.from('milestones').select('id,title,post_id'));
  const byTitle: Record<string, string> = {
    'nbro-manchester': 'Meeting with NBRO',
    'icsd-2025': 'Best Scientific Paper',
    'participatory-2026': 'Participatory flood',
    'street-cloud-2026': 'Street Cloud',
  };
  let tied = 0;
  for (const [key, slug] of Object.entries(MILESTONE_POST_SLUG)) {
    const m = ms.find((x) => !x.post_id && (x.title as string).startsWith(byTitle[key]));
    const pid = postId.get(slug);
    if (m && pid) {
      must(await db.from('milestones').update({ post_id: pid }).eq('id', m.id).select('id'));
      tied++;
    }
  }
  log('journey entries tied to posts', tied);
}

main().catch((e) => {
  console.error('import failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
