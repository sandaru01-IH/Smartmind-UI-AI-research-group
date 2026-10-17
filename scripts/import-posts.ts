/**
 * Imports posts written in the "admin-form" markdown format (one `###` block per post) as drafts.
 *   npm run import-posts -- "path/to/file.md" --dry     (parse and check only)
 *   npm run import-posts -- "path/to/file.md"           (write to the database as drafts)
 *   npm run import-posts -- "path/to/file.md" --publish (write and publish)
 *
 * Every post is validated with the same schema the admin form uses. Posts are inserted as drafts in
 * the news section; award posts also go to the gallery and the awards page, papers to the
 * publications page. A post with a "Confirm" line is flagged "to be confirmed". People, venue and the
 * Confirm text have no field on a post, so they are written to docs/post-import-notes.json for the
 * later step of linking posts to team members. Safe to re-run: rows are matched by slug.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { postInputSchema, type PostInput } from '../lib/schemas';
import { serviceClient } from './_env';

interface Parsed {
  input: Record<string, unknown>;
  /** When a published post should read as published: its event date, else January of its year. */
  publishAt: string | null;
  notes: { slug: string; title: string; people: string; venue: string; confirm: string };
}

const field = (block: string, label: string): string | null => {
  const m = block.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]*?)(?=\\s·\\s\\*\\*|\\n|$)`));
  return m ? m[1].trim() : null;
};

function isoDate(raw: string | null): string | null {
  const m = raw?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function parseBlock(title: string, block: string): Parsed {
  const slug = field(block, 'Slug')?.replace(/`/g, '') ?? '';
  const category = field(block, 'Category') ?? '';
  const tags = (field(block, 'Tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const excerpt = block.match(/\*\*Excerpt:\*\*\s*([^\n]+)/)?.[1].trim() ?? '';
  const bodyMatch = block.match(/\*\*Body:\*\*\s*\n([\s\S]*?)\n\*\*People:\*\*/);
  const body = bodyMatch ? bodyMatch[1].trim() : '';
  const meta = block.match(/\*\*People:\*\*([^\n]*)/)?.[1] ?? '';
  const people = meta.split('·')[0].trim();
  const venue = meta.match(/\*\*Venue:\*\*\s*([^·]*)/)?.[1].trim() ?? '';
  const confirm = meta.match(/\*\*Confirm:\*\*\s*(.*)$/)?.[1].trim() ?? '';
  const award = category === 'Award';

  const eventRaw = field(block, 'Event date');
  const eventDate = isoDate(eventRaw);
  const year = eventRaw?.match(/\b(19|20)\d{2}\b/)?.[0];
  const publishAt = eventDate
    ? `${eventDate}T09:00:00.000Z`
    : year
      ? `${year}-01-01T09:00:00.000Z`
      : null;

  return {
    publishAt,
    input: {
      type: 'article',
      title,
      slug,
      excerpt,
      body_md: body,
      category,
      tags,
      event_date: eventDate,
      status: 'draft',
      published_at: null,
      show_in_news: true,
      show_in_ticker: false,
      in_gallery: award,
      in_awards: award,
      in_publications: !award,
      tbc: confirm !== '',
    },
    notes: { slug, title, people, venue, confirm },
  };
}

function parse(markdown: string): Parsed[] {
  // Posts start at "### " and end at the next heading of any level.
  const parts = markdown.split(/\n(?=#{2,3} )/);
  const out: Parsed[] = [];
  for (const part of parts) {
    const m = part.match(/^### (.+)\n([\s\S]*)$/);
    if (m) out.push(parseBlock(m[1].trim(), m[2]));
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Usage: npm run import-posts -- "file.md" [--dry]');
    process.exit(1);
  }
  const posts = parse(readFileSync(file, 'utf8'));
  const problems: string[] = [];
  const rows: PostInput[] = [];
  const publishAtBySlug = new Map<string, string | null>();
  const seen = new Set<string>();
  for (const p of posts) {
    const r = postInputSchema.safeParse(p.input);
    const slug = String(p.input.slug);
    if (!r.success) {
      problems.push(
        `${slug || p.notes.title}: ${r.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
      continue;
    }
    if (seen.has(slug)) {
      problems.push(`${slug}: duplicate slug in the file`);
      continue;
    }
    seen.add(slug);
    rows.push(r.data);
    publishAtBySlug.set(slug, p.publishAt);
  }

  const count = (f: (r: PostInput) => boolean) => rows.filter(f).length;
  console.log(`Parsed ${posts.length} posts, ${rows.length} valid.`);
  console.log(
    `  awards: ${count((r) => r.category === 'Award')}, chatbot: ${count((r) => r.category === 'Chatbot')}, publication: ${count((r) => r.category === 'Publication')}`,
  );
  console.log(
    `  with a date: ${count((r) => r.event_date !== null)}, flagged to be confirmed: ${count((r) => r.tbc)}`,
  );
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  - ${p}`);
  }
  if (dry || problems.length) {
    if (!dry) console.log('\nNothing written: fix the problems above first.');
    return;
  }

  // --publish: go live at once. The database allows posts without a thumbnail (the site draws cover
  // art for them); the admin form asks for one only when a person publishes by hand.
  const publish = args.includes('--publish');
  const now = new Date().toISOString();
  const toWrite = publish
    ? rows.map((r) => ({
        ...r,
        status: 'published' as const,
        published_at: publishAtBySlug.get(r.slug) ?? now,
      }))
    : rows;
  const db = serviceClient();
  const { error } = await db.from('posts').upsert(toWrite, { onConflict: 'slug' });
  if (error) throw error;
  writeFileSync(
    'docs/post-import-notes.json',
    JSON.stringify(
      posts.map((p) => p.notes),
      null,
      2,
    ) + '\n',
  );
  console.log(
    `\nWrote ${rows.length} ${publish ? 'published' : 'draft'} posts. Notes saved to docs/post-import-notes.json.`,
  );
}

main().catch((e) => {
  console.error('import failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
