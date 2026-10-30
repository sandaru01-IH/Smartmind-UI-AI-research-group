import { connection } from 'next/server';
import Link from 'next/link';
import { PostsTable, CommunityTabs } from '@/components/admin/moderation-tables';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminBlogPosts } from '@/lib/blog/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function AdminCommunityPostsPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const posts = await adminBlogPosts(supabase);
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
          Posts written by members. Switch one to Hidden if it is not appropriate: it leaves the
          public site at once, and its writer is told. You cannot change what they wrote.
        </p>
      </header>
      <CommunityTabs />
      <PostsTable posts={posts} />
    </div>
  );
}
