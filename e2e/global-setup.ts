import { config } from 'dotenv';
import { ADMIN_EMAIL, ADMIN_PASSWORD, serviceClient } from './support';

config({ path: '.env.local', quiet: true });

/** Creates a dedicated e2e admin through the same service-role path as `npm run create-admin`. */
export default async function globalSetup() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const db = serviceClient();
  let id: string | null = null;
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  id = data?.users.find((u) => u.email === ADMIN_EMAIL)?.id ?? null;
  if (id) {
    await db.auth.admin.updateUserById(id, { password: ADMIN_PASSWORD, email_confirm: true });
  } else {
    const created = await db.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error('Could not create the e2e admin');
    id = created.data.user.id;
  }
  const { error } = await db.from('profiles').upsert({ id, role: 'admin' });
  if (error) throw error;
}
