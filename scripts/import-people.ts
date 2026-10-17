/**
 * Turns the author lists saved by import-posts (docs/post-import-notes.json) into team members and
 * links every post to its people, so profiles, the team map and its connections fill themselves in.
 *   npm run import-people -- --dry     (show who would be created)
 *   npm run import-people              (write to the database)
 *
 * Names are matched conservatively. The CV writes authors as initials plus a surname, so two strings
 * with the same surname are the same person only when one set of initials is the start of the other
 * ("N. Bandara" and "N. S. Bandara"), or when ALIASES says so. Members already in the project's sourced
 * team list (content/team.ts) get their full name, group and affiliation from it. People with a single
 * paper are saved but hidden; show them in the admin if you want them on the map.
 */
import { readFileSync } from 'node:fs';
import { SEED_LINKS, TEAM } from '../content/team';
import { slugify } from '../lib/slug';
import { serviceClient } from './_env';

interface Note {
  slug: string;
  people: string;
}

/** Lower-case variant → the one name it stands for. Each is a judgement call, listed so it can be reviewed. */
const ALIASES: Record<string, string> = {
  'a. jayasinghe': 'Amila Jayasinghe',
  'a. b. jayasinghe': 'Amila Jayasinghe',
  'amila jayasinghe': 'Amila Jayasinghe',
  'c. abenayake': 'Chethika Abenayake',
  'c. c. abenayake': 'Chethika Abenayake',
  'n. sanjaya': 'Niroshan Sanjaya',
  's. sankalpa': 'Sandaruwan Sankalpa (Silva)',
  'f. hasan': 'Farasath Hasan',
  'l. kaveesha': 'Lahiru Kaveesha',
  's. sathsarana': 'Sahan Sathsarana',
  'sahan sathsarana': 'Sahan Sathsarana',
  'h. w. a. s. sathsarana': 'Sahan Sathsarana',
  'm. deshan': 'Malith Deshan',
  'h. sawandi': 'Harini Sawandi',
  's. madusanka': 'Samith Madusanka',
  'n. b. s. madusanka': 'Samith Madusanka',
  'c. hewawasam': 'Choolaka Hewawasam',
  'j. jayasanka': 'Jasintha Jayasanka',
  'b. amila': 'Buddhika Amila Kumara',
  'p. kalansooriya': 'Pradeep Kalansooriya',
  'h. n. kalpana': 'L. D. C. H. N. Kalpana',
  'l. kalpana': 'L. D. C. H. N. Kalpana',
  'n. tenzin': 'N. Tenzin',
  'n. z. tenzin': 'N. Tenzin',
  'n. y. tenzin': 'N. Tenzin',
  'n. wijayawardana': 'P. N. P. Wijayawardana',
  'n. p. wijayawardana': 'P. N. P. Wijayawardana',
  'p. n. p. wijayawardana': 'P. N. P. Wijayawardana',
  'm. t. o. v. peris': 'M. T. O. V. Peiris',
  'r. safra de campos': 'R. Safra de Campos',
};

const clean = (raw: string) =>
  raw
    .replace(/\s*\(.*?\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
const initialsOf = (name: string) =>
  name
    .split(' ')
    .slice(0, -1)
    .map((t) => t[0]?.toUpperCase() ?? '')
    .join('');
const surnameOf = (name: string) => name.split(' ').slice(-1)[0].toLowerCase();

/** Maps every raw author string to its canonical display name. */
function resolveNames(raw: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const rest: string[] = [];
  for (const r of raw) {
    const alias = ALIASES[clean(r).toLowerCase()];
    if (alias) result.set(r, alias);
    else rest.push(clean(r));
  }
  const bySurname = new Map<string, string[]>();
  for (const n of new Set(rest))
    bySurname.set(surnameOf(n), [...(bySurname.get(surnameOf(n)) ?? []), n]);
  for (const group of bySurname.values()) {
    const longest = (n: string) =>
      group
        .filter(
          (m) =>
            initialsOf(m).startsWith(initialsOf(n)) && initialsOf(m).length >= initialsOf(n).length,
        )
        .sort((a, b) => initialsOf(b).length - initialsOf(a).length || a.localeCompare(b));
    for (const n of group) result.set(n, longest(n)[0] ?? n);
  }
  for (const r of raw) if (!result.has(r)) result.set(r, result.get(clean(r)) ?? clean(r));
  return result;
}

async function main() {
  const dry = process.argv.includes('--dry');
  const notes: Note[] = JSON.parse(readFileSync('docs/post-import-notes.json', 'utf8'));

  const rawBySlug = new Map<string, string[]>();
  const all = new Set<string>();
  for (const n of notes) {
    if (!n.people || /not named/i.test(n.people)) continue;
    const list = n.people
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    rawBySlug.set(n.slug, list);
    list.forEach((s) => all.add(s));
  }
  const canon = resolveNames([...all]);

  const worksBy = new Map<string, Set<string>>();
  for (const [slug, list] of rawBySlug)
    for (const r of list) {
      const name = canon.get(r) ?? clean(r);
      (worksBy.get(name) ?? worksBy.set(name, new Set()).get(name)!).add(slug);
    }

  const known = new Map(TEAM.map((p) => [p.name, p]));
  const GROUP = { core: 'Core', authors: 'Authors', collaborator: 'Collaborator' } as const;
  const names = [...worksBy.keys()].sort((a, b) => {
    const ka = known.get(a);
    const kb = known.get(b);
    if (!!ka !== !!kb) return ka ? -1 : 1;
    return (worksBy.get(b)?.size ?? 0) - (worksBy.get(a)?.size ?? 0) || a.localeCompare(b);
  });

  const usedSlugs = new Set<string>();
  const members = names.map((name, i) => {
    const k = known.get(name);
    const count = worksBy.get(name)?.size ?? 0;
    let slug = k?.slug ?? slugify(name).slice(0, 70);
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(name).slice(0, 66)}-${n}`;
    usedSlugs.add(slug);
    return {
      slug,
      name,
      role: '',
      group_label: k ? GROUP[k.group] : 'Co-author',
      affiliation: k?.affiliation ?? '',
      education: '',
      qualifications: '',
      contribution: k ? k.appears.join('. ') : '',
      visible: Boolean(k) || count >= 2,
      sort_order: i,
    };
  });

  const visible = members.filter((m) => m.visible).length;
  console.log(
    `${all.size} author strings → ${members.length} people (${visible} shown on the map, ${members.length - visible} hidden: one paper only).`,
  );
  console.log('Merged variants:');
  const merged = new Map<string, string[]>();
  for (const [raw, name] of canon)
    if (raw !== name) merged.set(name, [...(merged.get(name) ?? []), raw]);
  for (const [name, raws] of merged) console.log(`  ${name} ← ${raws.join(' | ')}`);
  if (dry) return;

  const db = serviceClient();
  const up = await db
    .from('team_members')
    .upsert(members, { onConflict: 'slug' })
    .select('id,slug,name');
  if (up.error) throw up.error;
  const idByName = new Map(up.data.map((m) => [m.name as string, m.id as string]));
  const idBySlug = new Map(up.data.map((m) => [m.slug as string, m.id as string]));

  const posts = await db
    .from('posts')
    .select('id,slug')
    .in('slug', [...rawBySlug.keys()]);
  if (posts.error) throw posts.error;
  const postId = new Map(posts.data.map((p) => [p.slug as string, p.id as string]));

  const del = await db
    .from('work_people')
    .delete()
    .in('post_id', [...postId.values()]);
  if (del.error) throw del.error;
  const links = new Set<string>();
  const rows: { member_id: string; post_id: string }[] = [];
  for (const [slug, list] of rawBySlug) {
    const pid = postId.get(slug);
    if (!pid) continue;
    for (const r of list) {
      const mid = idByName.get(canon.get(r) ?? clean(r));
      if (!mid || links.has(`${mid}|${pid}`)) continue;
      links.add(`${mid}|${pid}`);
      rows.push({ member_id: mid, post_id: pid });
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    const res = await db.from('work_people').insert(rows.slice(i, i + 200));
    if (res.error) throw res.error;
  }

  // The hand-drawn connections the project already sourced, where both people now exist.
  const manual = SEED_LINKS.flatMap((l) => {
    const a = idBySlug.get(l.a);
    const b = idBySlug.get(l.b);
    return a && b ? [{ a, b, label: l.label }] : [];
  });
  if (manual.length) {
    const ex = await db.from('team_links').select('a,b');
    if (ex.error) throw ex.error;
    const have = new Set((ex.data ?? []).map((l) => [l.a, l.b].sort().join('|')));
    const fresh = manual.filter((l) => !have.has([l.a, l.b].sort().join('|')));
    if (fresh.length) {
      const res = await db.from('team_links').insert(fresh);
      if (res.error) throw res.error;
    }
  }
  console.log(
    `\nSaved ${members.length} people, ${rows.length} person-to-post links, ${manual.length} sourced connections.`,
  );
}

main().catch((e) => {
  console.error('import failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
