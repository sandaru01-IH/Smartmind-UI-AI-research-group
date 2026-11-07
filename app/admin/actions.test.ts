import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};
const profileRole = vi.fn();

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': '198.51.100.9' }),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { redirectTo: to });
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/supabase/server-client', () => ({
  createSessionClient: async () => ({
    auth,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => profileRole() }) }),
    }),
  }),
}));

const { accountThrottle, loginThrottle } = await import('@/lib/auth/throttle');
const { loginAction, logoutAction } = await import('./actions');

const EMAIL = 'member@example.test';

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

async function run<T>(fn: () => Promise<T>): Promise<T | { redirectTo: string }> {
  try {
    return await fn();
  } catch (e) {
    const to = (e as { redirectTo?: string }).redirectTo;
    if (to) return { redirectTo: to };
    throw e;
  }
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  loginThrottle.reset(`198.51.100.9|${EMAIL}`);
  accountThrottle.reset(EMAIL);
  auth.signOut.mockResolvedValue({ error: null });
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe('admin sign-out', () => {
  it('logout signs out this browser only', async () => {
    expect(await run(() => logoutAction())).toEqual({ redirectTo: '/admin/login' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('a member who tries the admin login is signed out of this browser only', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'm1' } }, error: null });
    profileRole.mockResolvedValue({ data: { role: 'member' }, error: null });
    const result = await run(() =>
      loginAction({}, form({ email: EMAIL, password: 'A-long-enough-password-1' })),
    );
    expect(result).toEqual({ error: 'The email or password is not correct.' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
