import { config } from 'dotenv';
import { ADMIN_EMAIL, TITLE_PREFIX, serviceClient } from './support';

config({ path: '.env.local', quiet: true });

export default async function globalTeardown() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const db = serviceClient();
  await db.from('posts').delete().like('title', `${TITLE_PREFIX}%`);
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  const id = data?.users.find((u) => u.email === ADMIN_EMAIL)?.id;
  if (id) await db.auth.admin.deleteUser(id);
}
