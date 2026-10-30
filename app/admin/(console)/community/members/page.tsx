import { connection } from 'next/server';
import Link from 'next/link';
import { MembersTable, CommunityTabs } from '@/components/admin/moderation-tables';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminMembers } from '@/lib/blog/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function AdminCommunityMembersPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const members = await adminMembers(supabase);
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-[0.95rem] text-muted hover:text-fg"
        >
          ← Dashboard
        </Link>
        <h1 className="text-3xl">Community</h1>
        <p className="mt-2 max-w-[62ch] text-muted">
          Everyone who has registered. Block someone to hide their profile, posts and comments and
          stop them posting. Nothing is deleted, and you can allow them again.
        </p>
      </header>
      <CommunityTabs />
      <MembersTable members={members} />
    </div>
  );
}
