import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = {
  getClaims: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};
const getMember = vi.fn();

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': '198.51.100.7' }),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { redirectTo: to });
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/members/session', () => ({ getMember: () => getMember() }));
vi.mock('@/lib/supabase/server-client', () => ({
  createSessionClient: async () => ({ auth }),
}));

const { t } = await import('@/content/strings');
const { passwordChangeThrottle } = await import('@/lib/auth/throttle');
const { deleteMyAccountAction, memberLogoutAction, resetPasswordAction } =
  await import('./members-actions');

const USER = 'user-1';
const NEW_PASSWORD = 'A-brand-new-password-2!';
const nowSeconds = () => Math.floor(Date.now() / 1000);

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

/** Runs an action; returns its state, or where it redirected to. */
async function run<T>(fn: () => Promise<T>): Promise<T | { redirectTo: string }> {
  try {
    return await fn();
  } catch (e) {
    const to = (e as { redirectTo?: string }).redirectTo;
    if (to) return { redirectTo: to };
    throw e;
  }
}

const claims = (amr: unknown) => ({
  data: { claims: { sub: USER, amr }, header: {}, signature: new Uint8Array() },
  error: null,
});
const FRESH_RECOVERY = () => claims([{ method: 'otp', timestamp: nowSeconds() - 30 }]);
const PASSWORD_LOGIN = () => claims([{ method: 'password', timestamp: nowSeconds() - 30 }]);
const STALE_RECOVERY = () => claims([{ method: 'otp', timestamp: nowSeconds() - 3600 }]);

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  passwordChangeThrottle.reset(USER);
  auth.signOut.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
  auth.getUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe('resetPasswordAction', () => {
  const submit = () => run(() => resetPasswordAction({}, form({ password: NEW_PASSWORD })));

  it.each([
    ['a password login', PASSWORD_LOGIN],
    ['a recovery session older than 15 minutes', STALE_RECOVERY],
    ['no session', () => ({ data: null, error: { status: 401, message: 'no session' } })],
  ])('refuses %s without touching the password', async (_n, answer) => {
    auth.getClaims.mockResolvedValue(answer());
    expect(await submit()).toEqual({ error: t.members.resetExpired, expired: true });
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('with a fresh recovery session: sets the password, signs out other devices, goes to the account', async () => {
    auth.getClaims.mockResolvedValue(FRESH_RECOVERY());
    expect(await submit()).toEqual({ redirectTo: '/account?password=changed' });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: NEW_PASSWORD });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
    expect(auth.updateUser.mock.invocationCallOrder[0]).toBeLessThan(
      auth.signOut.mock.invocationCallOrder[0],
    );
  });

  it('a failed update keeps everyone signed in and says so', async () => {
    auth.getClaims.mockResolvedValue(FRESH_RECOVERY());
    auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: { status: 422, code: 'same_password', message: 'same' },
    });
    expect(await submit()).toEqual({ error: t.members.resetFailed });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('allows 5 changes an hour per user, then stops before calling Supabase', async () => {
    auth.getClaims.mockResolvedValue(FRESH_RECOVERY());
    for (let i = 0; i < 5; i++) {
      expect(await submit()).toEqual({ redirectTo: '/account?password=changed' });
    }
    const sixth = await submit();
    expect(sixth).toEqual({ error: expect.stringMatching(/^Too many attempts\. Try again in/) });
    expect(auth.updateUser).toHaveBeenCalledTimes(5);
  });
});

describe('memberLogoutAction', () => {
  it('signs out this browser only', async () => {
    expect(await run(() => memberLogoutAction())).toEqual({ redirectTo: '/' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('deleteMyAccountAction', () => {
  const calls: string[] = [];
  const rpc = vi.fn();
  const remove = vi.fn();
  const member = (photoPath: string | null) => ({
    supabase: {
      rpc: (...a: unknown[]) => {
        calls.push('rpc');
        return rpc(...a);
      },
      storage: {
        from: () => ({
          remove: (...a: unknown[]) => {
            calls.push('remove');
            return remove(...a);
          },
        }),
      },
      auth,
    },
    user: { id: USER, email: 'm@example.test' },
    profile: { displayName: 'M', bio: '', photoPath, blocked: false },
    verified: true,
    canPost: true,
  });
  const submit = () => run(() => deleteMyAccountAction({}, form({ confirm: 'DELETE' })));

  beforeEach(() => {
    calls.length = 0;
    rpc.mockReset();
    remove.mockReset();
    remove.mockResolvedValue({ data: [], error: null });
  });

  it('an admin (refused by the database) keeps their photo', async () => {
    getMember.mockResolvedValue(member(`members/${USER}/me.png`));
    rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Admin accounts cannot be deleted here' },
    });
    expect(await submit()).toEqual({ error: t.members.deleteFailed });
    expect(remove).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('any database failure keeps the photo', async () => {
    getMember.mockResolvedValue(member(`members/${USER}/me.png`));
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'down' } });
    expect(await submit()).toEqual({ error: t.members.deleteFailed });
    expect(remove).not.toHaveBeenCalled();
  });

  it('removes the photo only after the account is gone, then signs this browser out', async () => {
    getMember.mockResolvedValue(member(`members/${USER}/me.png`));
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await submit()).toEqual({ redirectTo: '/' });
    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(remove).toHaveBeenCalledWith([`members/${USER}/me.png`]);
    expect(calls).toEqual(['rpc', 'remove']);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('without a photo, storage is not touched', async () => {
    getMember.mockResolvedValue(member(null));
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await submit()).toEqual({ redirectTo: '/' });
    expect(remove).not.toHaveBeenCalled();
  });
});
