import { Suspense } from 'react';
import { HeroFallback } from '@/components/hero/hero-fallback';
import { TeamNetwork } from '@/components/team/team-network';
import { PageHeader } from '@/components/ui/page-header';
import { getTeamNetwork } from '@/lib/team/public';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Team',
  description:
    'The Smartmind team as a network: the people behind the Urban Simulation Lab and how they work together.',
  path: '/team',
});

async function Network() {
  const { members, links } = await getTeamNetwork();
  if (members.length === 0) {
    return (
      <p className="border border-dashed border-line-strong p-6 text-muted">
        The team will appear here soon.
      </p>
    );
  }
  return <TeamNetwork members={members} links={links} backdrop={<HeroFallback />} />;
}

export default function TeamPage() {
  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="The team network"
        lead="Every person is a node, every line a way of working together."
      />
      <div className="container-site pb-24">
        <Suspense
          fallback={<div className="h-[32rem] border border-line bg-surface" aria-hidden="true" />}
        >
          <Network />
        </Suspense>
      </div>
    </>
  );
}
