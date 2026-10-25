import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import {
  CollabsManager,
  FeaturedManager,
  AwardsManager,
  JourneyManager,
  PartnersManager,
  PublicationsManager,
  ResearchManager,
} from '@/components/admin/content-manager';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  adminCollabs,
  adminFeatured,
  adminAwards,
  adminMilestones,
  adminPartners,
  adminSpotlights,
  adminPublications,
  adminResearch,
  postsFeeding,
  adminWorkLinks,
} from '@/lib/catalog/admin';
import { CONTENT_KINDS, isContentKind } from '@/lib/catalog/kinds';
import type { WorkLink } from '@/lib/catalog/types';
import { adminListAll } from '@/lib/posts/admin';
import { adminTeam } from '@/lib/team/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

const grouped = (links: WorkLink[], key: 'award_id' | 'publication_id') => {
  const out: Record<string, string[]> = {};
  for (const l of links) {
    const id = l[key];
    if (id) (out[id] ??= []).push(l.member_id);
  }
  return out;
};

export default async function ContentPage({ params }: { params: Promise<{ kind: string }> }) {
  await connection();
  const { kind } = await params;
  if (!isContentKind(kind)) notFound();
  const { supabase } = await requireAdmin();
  const meta = CONTENT_KINDS.find((k) => k.id === kind)!;

  let body;
  if (kind === 'awards' || kind === 'publications') {
    const [items, team, links, posts] = await Promise.all([
      kind === 'awards' ? adminAwards(supabase) : adminPublications(supabase),
      adminTeam(supabase),
      adminWorkLinks(supabase),
      adminListAll(supabase),
    ]);
    const fromPosts = postsFeeding(posts, kind === 'awards' ? 'in_awards' : 'in_publications');
    const people = team.members.map(({ id, name, group_label }) => ({ id, name, group_label }));
    body =
      kind === 'awards' ? (
        <AwardsManager
          awards={items as Awaited<ReturnType<typeof adminAwards>>}
          people={people}
          linked={grouped(links, 'award_id')}
          fromPosts={fromPosts}
        />
      ) : (
        <PublicationsManager
          publications={items as Awaited<ReturnType<typeof adminPublications>>}
          people={people}
          linked={grouped(links, 'publication_id')}
          fromPosts={fromPosts}
        />
      );
  } else if (kind === 'featured') {
    body = <FeaturedManager items={await adminFeatured(supabase)} />;
  } else if (kind === 'collaborations') {
    body = <CollabsManager items={await adminCollabs(supabase)} />;
  } else if (kind === 'partners') {
    body = <PartnersManager partners={await adminPartners(supabase)} />;
  } else if (kind === 'journey') {
    const [milestones, posts] = await Promise.all([
      adminMilestones(supabase),
      adminListAll(supabase),
    ]);
    body = (
      <JourneyManager
        milestones={milestones}
        posts={posts.map(({ id, title, tbc }) => ({ id, title, tbc }))}
      />
    );
  } else {
    const [r, spotlights] = await Promise.all([adminResearch(supabase), adminSpotlights(supabase)]);
    body = <ResearchManager themes={r.themes} topics={r.topics} spotlights={spotlights} />;
  }

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin/content"
          className="inline-flex min-h-11 items-center text-[0.95rem] text-muted hover:text-fg"
        >
          ← Site content
        </Link>
        <h1 className="text-3xl">{meta.label}</h1>
        <p className="mt-2 max-w-[62ch] text-muted">{meta.blurb}</p>
        <nav aria-label="Content sections" className="mt-4 flex flex-wrap gap-2">
          {CONTENT_KINDS.map((k) => (
            <Link
              key={k.id}
              href={`/admin/content/${k.id}`}
              aria-current={k.id === kind ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-sharp border px-4 text-[0.95rem] ${
                k.id === kind
                  ? 'border-signal bg-surface-2 font-semibold'
                  : 'border-line-strong text-muted hover:text-fg'
              }`}
            >
              {k.label}
            </Link>
          ))}
        </nav>
      </header>
      {body}
    </div>
  );
}
