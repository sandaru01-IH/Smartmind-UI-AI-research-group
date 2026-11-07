import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ProfileNameRejectedError, saveMyProfile } from './member';

/** A client whose profile update answers with the given error. */
function dbAnswering(error: { code?: string; message: string } | null): SupabaseClient {
  return {
    from: () => ({ update: () => ({ eq: async () => ({ error }) }) }),
  } as unknown as SupabaseClient;
}
const input = { display_name: 'Admin Rossi', bio: '' };

describe('saveMyProfile', () => {
  it('saves quietly when the database accepts the profile', async () => {
    await expect(saveMyProfile(dbAnswering(null), 'u1', input)).resolves.toBeUndefined();
  });

  it('turns a check violation into a typed error, never the raw database text', async () => {
    const raw =
      'new row for relation "member_profiles" violates check constraint "member_display_name_clean"';
    const err = await saveMyProfile(dbAnswering({ code: '23514', message: raw }), 'u1', input).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ProfileNameRejectedError);
    expect((err as Error).message).not.toContain('violates');
  });

  it('still throws other database errors as they are', async () => {
    await expect(
      saveMyProfile(dbAnswering({ code: '42501', message: 'permission denied' }), 'u1', input),
    ).rejects.toThrow('permission denied');
  });
});
