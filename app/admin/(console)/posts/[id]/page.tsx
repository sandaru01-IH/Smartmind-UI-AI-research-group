import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PostEditor } from '@/components/admin/post-editor';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminGet } from '@/lib/posts/admin';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await adminGet(supabase, id);
  if (!post) notFound();
  return <PostEditor key={post.id} post={post} />;
}
