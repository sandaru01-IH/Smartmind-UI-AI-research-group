/**
 * Copies the site's content from the LOCAL Supabase (.env.local) to a HOSTED project, exactly as it is:
 * same rows, same ids, same links between them, plus the files in the media bucket.
 *
 *   $env:HOSTED_SUPABASE_URL="https://YOUR-REF.supabase.co"
 *   $env:HOSTED_SERVICE_ROLE_KEY="..."          # Project Settings > API Keys > service_role / secret
 *   npm run copy-to-hosted -- --dry             # count what would be copied
 *   npm run copy-to-hosted                      # copy
 *
 * It refuses to run unless the hosted tables are empty (run hosted-clean-install.sql first), so it can
 * never overwrite content. Logins are not copied: create the admin on the hosted project with
 * `npm run create-admin`. The `author_id` of posts is cleared because it points at a local login.
 * The keys are read from your terminal only and never written to a file.
 */
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parse } from 'dotenv';

/** Parents before children, so every link finds the row it points at. */
const TABLES = [
  'posts',
  'team_members',
  'team_links',
  'awards',
  'publications',
  'partners',
  'research_themes',
  'research_projects',
  'research_topics',
  'research_spotlights',
  'milestones',
  'work_people',
] as const;

const dry = process.argv.includes('--dry');
const BUCKET = 'media';

/**
 * The LOCAL source is always read from .env.local itself, never from the terminal's variables, so a
 * hosted URL left in the shell can never be mistaken for the local database.
 */
function local(): SupabaseClient {
  const env = parse(readFileSync('.env.local'));
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(
      '.env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local).',
    );
    process.exit(1);
  }
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    console.error(`.env.local points at ${url}, which is not local. Refusing to copy from it.`);
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function hosted(): SupabaseClient {
  const url = process.env.HOSTED_SUPABASE_URL?.trim();
  const key = process.env.HOSTED_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(
      'Set HOSTED_SUPABASE_URL and HOSTED_SERVICE_ROLE_KEY (exactly these two names) in this terminal first.',
    );
    process.exit(1);
  }
  if (/127\.0\.0\.1|localhost/.test(url)) {
    console.error('HOSTED_SUPABASE_URL points at a local address. Use the hosted project URL.');
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readAll(db: SupabaseClient, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function listFiles(db: SupabaseClient, prefix = ''): Promise<string[]> {
  const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`storage: ${error.message}`);
  const out: string[] = [];
  for (const e of data ?? []) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id === null) out.push(...(await listFiles(db, path)));
    else out.push(path);
  }
  return out;
}

async function main() {
  const source = local();
  const remote = hosted();

  // The hosted tables must be empty: this script only ever adds.
  for (const t of TABLES) {
    const r = await remote.from(t).select('id', { count: 'exact', head: true });
    if (r.error)
      throw new Error(`hosted ${t}: ${r.error.message} (did hosted-clean-install.sql run?)`);
    if ((r.count ?? 0) > 0) {
      console.error(`Hosted table "${t}" already has ${r.count} rows. Nothing was copied.`);
      process.exit(1);
    }
  }

  const data = new Map<string, Record<string, unknown>[]>();
  for (const t of TABLES) {
    let rows = await readAll(source, t);
    if (t === 'posts') rows = rows.map((r) => ({ ...r, author_id: null }));
    data.set(t, rows);
  }
  const files = await listFiles(source);
  for (const t of TABLES) console.log(`${t.padEnd(20)} ${data.get(t)!.length}`);
  console.log(`${'media files'.padEnd(20)} ${files.length}`);
  if (dry) {
    console.log('\n(dry run: nothing written)');
    return;
  }

  for (const t of TABLES) {
    const rows = data.get(t)!;
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await remote.from(t).insert(rows.slice(i, i + 200));
      if (error) throw new Error(`${t}: ${error.message}`);
    }
  }
  for (const path of files) {
    const dl = await source.storage.from(BUCKET).download(path);
    if (dl.error || !dl.data) throw new Error(`download ${path}: ${dl.error?.message}`);
    const up = await remote.storage.from(BUCKET).upload(path, dl.data, {
      contentType: dl.data.type || undefined,
      upsert: true,
    });
    if (up.error) throw new Error(`upload ${path}: ${up.error.message}`);
  }

  // Verify: the hosted counts must equal the local ones.
  let ok = true;
  for (const t of TABLES) {
    const r = await remote.from(t).select('id', { count: 'exact', head: true });
    const want = data.get(t)!.length;
    if (r.count !== want) {
      ok = false;
      console.error(`MISMATCH ${t}: local ${want}, hosted ${r.count}`);
    }
  }
  console.log(
    ok ? '\nCopied and verified: every table matches.' : '\nCopy finished with mismatches.',
  );
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error('copy failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
