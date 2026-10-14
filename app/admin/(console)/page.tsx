import { connection } from 'next/server';
import Link from 'next/link';
import { PostsTable, type AdminRow } from '@/components/admin/posts-table';
import { QuickUpdate } from '@/components/admin/quick-update';
import { buttonClass } from '@/components/ui/button';
import { requireAdmin } from '@/lib/auth/require-admin';
import { formatDate } from '@/lib/format';
import { adminList, adminStats } from '@/lib/posts/admin';
import { hasTbcFlag, type AdminListQuery } from '@/lib/posts/types';
import { CATEGORIES } from '@/lib/schemas';
import { publicState } from '@/lib/visibility';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const field =
  'h-11 w-full rounded-sharp border border-line-strong bg-surface px-3 text-base text-fg placeholder:text-muted';

export default async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const status =
    (['draft', 'published', 'scheduled'] as const).find((s) => s === one(sp.status)) ?? 'all';
  const sort =
    (['updated', 'published', 'title'] as const).find((s) => s === one(sp.sort)) ?? 'updated';
  const category = CATEGORIES.find((c) => c === one(sp.category)) ?? 'all';
  const type = (['article', 'update'] as const).find((t) => t === one(sp.type)) ?? 'all';
  const q = one(sp.q).slice(0, 80);
  const query: AdminListQuery = { q, status, category, type, sort };

  const [stats, posts] = await Promise.all([adminStats(supabase), adminList(supabase, query)]);
  const now = new Date();
  const rows: AdminRow[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    category: p.category,
    state: publicState(p, now),
    featured: p.featured,
    tbc: hasTbcFlag(p),
    published_at: p.published_at,
    updated_at: p.updated_at,
  }));

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl">Dashboard</h1>
        <dl className="mt-5 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            ['Published', String(stats.published)],
            ['Scheduled', String(stats.scheduled)],
            ['Drafts', String(stats.drafts)],
            ['Last update', stats.lastUpdated ? formatDate(stats.lastUpdated) : 'None yet'],
          ].map(([label, value]) => (
            <div key={label} className="bg-surface p-4">
              <dt className="label-mono text-muted">{label}</dt>
              <dd className="numeral mt-2 text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <QuickUpdate />

      <section aria-labelledby="posts-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="posts-title" className="text-2xl">
            Posts
          </h2>
          <Link href="/admin/posts/new" className={buttonClass('primary')}>
            New article
          </Link>
        </div>
        <form
          method="get"
          role="search"
          aria-label="Filter posts"
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <div className="lg:col-span-2">
            <label htmlFor="f-q" className="label-mono mb-2 block text-muted">
              Search
            </label>
            <input
              id="f-q"
              name="q"
              defaultValue={q}
              placeholder="Title, slug or tag"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="f-status" className="label-mono mb-2 block text-muted">
              Status
            </label>
            <select id="f-status" name="status" defaultValue={status} className={field}>
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-cat" className="label-mono mb-2 block text-muted">
              Category
            </label>
            <select id="f-cat" name="category" defaultValue={category} className={field}>
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-type" className="label-mono mb-2 block text-muted">
              Type
            </label>
            <select id="f-type" name="type" defaultValue={type} className={field}>
              <option value="all">All</option>
              <option value="article">Articles</option>
              <option value="update">Updates</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-sort" className="label-mono mb-2 block text-muted">
              Sort
            </label>
            <select id="f-sort" name="sort" defaultValue={sort} className={field}>
              <option value="updated">Recently updated</option>
              <option value="published">Publish date</option>
              <option value="title">Title</option>
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
            <button type="submit" className={buttonClass('secondary')}>
              Apply filters
            </button>
            <Link href="/admin" className={buttonClass('ghost')}>
              Reset
            </Link>
            <p role="status" className="label-mono ml-auto text-muted">
              {rows.length} shown
            </p>
          </div>
        </form>
        <div className="mt-6">
          <PostsTable rows={rows} />
        </div>
      </section>
    </div>
  );
}
