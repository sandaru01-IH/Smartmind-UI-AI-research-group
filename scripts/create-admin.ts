/**
 * Creates (or resets) an admin account. The only way to get an admin.
 *   npm run create-admin -- you@example.com
 * Password: read from ADMIN_PASSWORD, or generated and printed once. Minimum 12 characters.
 */
import { randomBytes } from 'node:crypto';
import { serviceClient } from './_env';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run create-admin -- you@example.com');
  process.exit(1);
}

const supplied = process.env.ADMIN_PASSWORD;
if (supplied && supplied.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}
const password = supplied ?? randomBytes(15).toString('base64url');
const db = serviceClient();

async function findUserId(): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let id = await findUserId();
  let created = false;
  if (id) {
    const { error } = await db.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error('No user returned');
    id = data.user.id;
    created = true;
  }
  const { error } = await db.from('profiles').upsert({ id, role: 'admin' });
  if (error) throw error;

  console.log(`${created ? 'Created' : 'Updated'} admin ${email}`);
  if (!supplied) console.log(`Password (shown once): ${password}`);
}

main().catch((e) => {
  console.error('create-admin failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
