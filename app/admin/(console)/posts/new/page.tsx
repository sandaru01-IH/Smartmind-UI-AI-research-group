import { connection } from 'next/server';
import { PostEditor } from '@/components/admin/post-editor';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminTeam } from '@/lib/team/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function NewPostPage() {
  await connection();
  const { supabase } = await requireAdmin();
  const { members } = await adminTeam(supabase);
  return (
    <PostEditor
      post={null}
      people={members.map(({ id, name, group_label }) => ({ id, name, group_label }))}
    />
  );
}
