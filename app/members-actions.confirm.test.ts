import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = {
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': '198.51.100.7' }),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { redirectTo: to });
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/members/session', () => ({ getMember: vi.fn() }));
vi.mock('@/lib/supabase/server-client', () => ({
  createSessionClient: async () => ({ auth }),
}));

const { confirmLinkAction } = await import('./members-actions');

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

/** Runs the action and returns where it redirected to. */
async function landing(fields: Record<string, string>): Promise<string> {
  try {
    await confirmLinkAction(form(fields));
  } catch (e) {
    const to = (e as { redirectTo?: string }).redirectTo;
    if (to) return to;
    throw e;
  }
  throw new Error('no redirect');
}

const RATE_LIMITED = { status: 429, code: 'over_request_rate_limit', message: 'Too many' };
const USED = { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' };

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  auth.signOut.mockResolvedValue({ error: null });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

/** verifyOtp answering `byType[type]`, or `fallback` for any other type. */
const answers =
  (byType: Record<string, object | null>, fallback: object | null = null) =>
  async ({ type }: { type: string }) => ({
    data: {},
    error: type in byType ? byType[type] : fallback,
  });

describe('confirmLinkAction with a token_hash link', () => {
  it('verifies a recovery link once, as recovery', async () => {
    auth.verifyOtp.mockImplementation(answers({}));
    expect(await landing({ token_hash: 'abc', type: 'recovery' })).toBe('/reset-password');
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' });
  });

  it.each([['email'], ['signup'], ['magiclink'], ['invite']])(
    'tries a %s link as recovery, then as its own type, and nothing else',
    async (type) => {
      auth.verifyOtp.mockImplementation(answers({ recovery: USED }));
      expect(await landing({ token_hash: 'abc', type })).toBe('/login?verified=1');
      expect(auth.verifyOtp.mock.calls.map(([a]) => a)).toEqual([
        { type: 'recovery', token_hash: 'abc' },
        { type, token_hash: 'abc' },
      ]);
    },
  );

  it('a reset token in a link that names the wrong type still reaches the new password', async () => {
    auth.verifyOtp.mockImplementation(answers({}));
    expect(await landing({ token_hash: 'abc', type: 'email' })).toBe('/reset-password');
    expect(auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('signs a confirmed email out locally so they log in once', async () => {
    auth.verifyOtp.mockImplementation(answers({ recovery: USED }));
    await landing({ token_hash: 'abc', type: 'email' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it.each([['sms'], ['phone_change'], ['email_change'], ['']])(
    'refuses type %j without verifying',
    async (type) => {
      expect(await landing({ token_hash: 'abc', type })).toBe('/login?error=confirm');
      expect(auth.verifyOtp).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['email', {}, '/login?error=busy', 1],
    ['email', { recovery: USED }, '/login?error=busy', 2],
    ['recovery', {}, '/forgot-password?error=busy', 1],
  ])(
    'a rate limit on a %s link says busy, not expired, and stops (%o)',
    async (type, byType, to, calls) => {
      auth.verifyOtp.mockImplementation(answers(byType, RATE_LIMITED));
      expect(await landing({ token_hash: 'abc', type })).toBe(to);
      expect(auth.verifyOtp).toHaveBeenCalledTimes(calls);
      expect(auth.signOut).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('[auth]', {
        action: 'confirmLink',
        status: 429,
        code: 'over_request_rate_limit',
      });
    },
  );

  it.each([
    ['email', '/login?error=confirm', 2],
    ['recovery', '/forgot-password?error=expired', 1],
  ])('a used %s link keeps its existing destination', async (type, to, calls) => {
    auth.verifyOtp.mockImplementation(answers({}, USED));
    expect(await landing({ token_hash: 'abc', type })).toBe(to);
    expect(auth.verifyOtp).toHaveBeenCalledTimes(calls);
  });

  it('a second press of a reset link that already signed them in goes on to the new password', async () => {
    auth.verifyOtp.mockImplementation(answers({}, USED));
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    expect(await landing({ token_hash: 'abc', type: 'recovery' })).toBe('/reset-password');
  });

  it('a signed-in user does not turn a failed email link into a success', async () => {
    auth.verifyOtp.mockImplementation(answers({}, USED));
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    expect(await landing({ token_hash: 'abc', type: 'email' })).toBe('/login?error=confirm');
  });
});

describe('confirmLinkAction with a code (PKCE) link', () => {
  it('a working code goes on to the new password', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    expect(await landing({ code: 'c1' })).toBe('/reset-password');
  });

  it('a failed code without a reset type is not called an expired reset link', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: USED });
    expect(await landing({ code: 'c1' })).toBe('/login?error=confirm');
  });

  it('a failed reset code goes back to ask for a new link', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: USED });
    expect(await landing({ code: 'c1', type: 'recovery' })).toBe('/forgot-password?error=expired');
  });

  it('a rate-limited code says busy', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: RATE_LIMITED });
    expect(await landing({ code: 'c1' })).toBe('/login?error=busy');
  });
});
