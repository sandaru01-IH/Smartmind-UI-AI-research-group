import { connection } from 'next/server';
import Link from 'next/link';
import { CommentsTable, CommunityTabs } from '@/components/admin/moderation-tables';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminBlogComments } from '@/lib/blog/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function AdminCommunityCommentsPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const comments = await adminBlogComments(supabase);
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
          Comments on community posts. Switch one to Hidden to remove it from the public page.
        </p>
      </header>
      <CommunityTabs />
      <CommentsTable comments={comments} />
    </div>
  );
}
