/**
 * Creates (or resets) an admin account. The only way to get an admin.
 *   npm run create-admin -- you@example.com [--force]
 * Password: read from ADMIN_PASSWORD, or generated and printed once. Minimum 12 characters.
 * An existing member account is NOT turned into an admin (and its password is not replaced)
 * unless --force is given; an existing admin can always be reset.
 */
import { randomBytes } from 'node:crypto';
import { serviceClient } from './_env';
import { shouldPromote, type ExistingAccount } from './create-admin-logic';

const args = process.argv.slice(2);
const force = args.includes('--force');
const email = args
  .find((a) => !a.startsWith('--'))
  ?.trim()
  .toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run create-admin -- you@example.com [--force]');
  process.exit(1);
}

const supplied = process.env.ADMIN_PASSWORD;
if (supplied && supplied.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}
const password = supplied ?? randomBytes(15).toString('base64url');
const db = serviceClient();

async function findExisting(): Promise<ExistingAccount | null> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) {
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('role')
        .eq('id', hit.id)
        .maybeSingle();
      if (profileError) throw profileError;
      return { id: hit.id, isAdmin: profile?.role === 'admin' };
    }
    if (data.users.length < perPage) return null;
  }
}

async function main() {
  const existing = await findExisting();
  const action = shouldPromote(existing, force);
  if (action === 'refuse') {
    console.error(
      `${email} already has a member account that is not an admin. Nothing was changed.\n` +
        'Promoting it would also replace its password. If that is really what you want,\n' +
        'run the command again with --force.',
    );
    process.exit(2);
  }

  let id = existing?.id ?? null;
  let created = false;
  if (id) {
    const { error } = await db.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
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
