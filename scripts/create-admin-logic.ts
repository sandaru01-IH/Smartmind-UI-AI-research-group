export type ExistingAccount = { id: string; isAdmin: boolean };
export type AdminAction = 'create' | 'update-admin' | 'refuse';

/**
 * Decides what create-admin may do for an e-mail address.
 * An existing member who is not yet an admin is never silently promoted (and
 * their password never silently replaced): that needs an explicit --force.
 */
export function shouldPromote(existing: ExistingAccount | null, force: boolean): AdminAction {
  if (!existing) return 'create';
  if (existing.isAdmin) return 'update-admin';
  return force ? 'update-admin' : 'refuse';
}
