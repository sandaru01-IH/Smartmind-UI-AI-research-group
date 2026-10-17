import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PostEditor } from '@/components/admin/post-editor';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWorkPeople } from '@/lib/catalog/admin';
import { adminGet } from '@/lib/posts/admin';
import { adminTeam } from '@/lib/team/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [post, team, linked] = await Promise.all([
    adminGet(supabase, id),
    adminTeam(supabase),
    adminWorkPeople(supabase, 'post', id),
  ]);
  if (!post) notFound();
  return (
    <PostEditor
      key={post.id}
      post={post}
      people={team.members.map(({ id: pid, name, group_label }) => ({
        id: pid,
        name,
        group_label,
      }))}
      linkedPeople={linked}
    />
  );
}
