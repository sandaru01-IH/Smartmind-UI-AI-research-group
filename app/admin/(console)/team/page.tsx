import { connection } from 'next/server';
import Link from 'next/link';
import { TeamManager } from '@/components/admin/team-manager';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminTeam } from '@/lib/team/admin';

export default async function AdminTeamPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const { members, links } = await adminTeam(supabase);
  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-[0.95rem] text-muted hover:text-fg"
        >
          ← Dashboard
        </Link>
        <h1 className="text-3xl">Team network</h1>
        <p className="mt-2 max-w-[62ch] text-muted">
          People appear as nodes on the public team page. Connections are the lines between them.
          Everything here is editable, nothing is fixed in code: names, roles, groups, education,
          qualifications, paper counts, photos, who is connected to whom, and who is shown.
        </p>
      </header>
      <TeamManager members={members} links={links} />
    </div>
  );
}
