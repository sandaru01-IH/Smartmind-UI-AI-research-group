import Link from 'next/link';
import { connection } from 'next/server';
import { ImportStarter } from '@/components/admin/content-manager';
import { adminListAll } from '@/lib/posts/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  adminAwards,
  adminMilestones,
  adminPartners,
  adminPublications,
  adminResearch,
  postsFeeding,
} from '@/lib/catalog/admin';
import { CONTENT_KINDS } from '@/lib/catalog/kinds';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function ContentHub() {
  await connection();
  const { supabase } = await requireAdmin();
  const [awards, pubs, partners, research, journey, posts] = await Promise.all([
    adminAwards(supabase),
    adminPublications(supabase),
    adminPartners(supabase),
    adminResearch(supabase),
    adminMilestones(supabase),
    adminListAll(supabase),
  ]);
  const counts: Record<string, number> = {
    awards: awards.length + postsFeeding(posts, 'in_awards').length,
    publications: pubs.length + postsFeeding(posts, 'in_publications').length,
    partners: partners.length,
    research: research.themes.length,
    journey: journey.length,
  };
  const anyEmpty = Object.values(counts).some((n) => n === 0);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl">Site content</h1>
        <p className="mt-2 max-w-[62ch] text-muted">
          Everything visitors read is edited here. Change something once and every page that uses it
          updates: the numbers on the home page, the profiles on the team page, the lists and
          timelines.
        </p>
      </header>
      {anyEmpty ? <ImportStarter /> : null}
      <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
        {CONTENT_KINDS.map((k) => (
          <li key={k.id} className="bg-bg">
            <Link href={`/admin/content/${k.id}`} className="block p-5 hover:bg-surface-2">
              <span className="label-mono text-muted">{counts[k.id]} items</span>
              <span className="mt-2 block text-xl">{k.label}</span>
              <span className="mt-1 block text-muted">{k.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
