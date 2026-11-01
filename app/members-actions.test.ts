import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
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

const { t } = await import('@/content/strings');
const { memberAccountThrottle, memberLoginThrottle, registerThrottle, resetThrottle } =
  await import('@/lib/auth/throttle');
const { forgotPasswordAction, memberLoginAction, registerAction } =
  await import('./members-actions');

const IP = '198.51.100.7';
const EMAIL = 'someone@example.test';
const LOGIN_KEY = `${IP}|${EMAIL}`;

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const loginForm = () => form({ email: EMAIL, password: 'whatever-password' });
const registerForm = () =>
  form({
    email: EMAIL,
    password: 'A-long-enough-password-1',
    displayName: 'Some One',
    acceptTerms: 'on',
  });

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  memberLoginThrottle.reset(LOGIN_KEY);
  memberAccountThrottle.reset(EMAIL);
  registerThrottle.reset(IP);
  resetThrottle.reset(IP);
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe('memberLoginAction', () => {
  it.each([
    ['request rate limit', { status: 429, code: 'over_request_rate_limit' }, t.members.tryLater],
    [
      'network failure',
      { status: 0, name: 'AuthRetryableFetchError', message: 'fetch failed' },
      t.members.unavailable,
    ],
    ['outage', { status: 503, message: 'Service Unavailable' }, t.members.unavailable],
  ])('%s is told the truth and never counts as a wrong password', async (_n, error, message) => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error });
    for (let i = 0; i < 9; i++) {
      expect(await memberLoginAction({}, loginForm())).toEqual({ error: message });
    }
    expect(memberLoginThrottle.check(LOGIN_KEY).locked).toBe(false);
    expect(memberAccountThrottle.check(EMAIL).locked).toBe(false);
  });

  it('wrong credentials count, and lock the key after the limit', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    expect(await memberLoginAction({}, loginForm())).toEqual({ error: t.members.loginFailed });
    for (let i = 0; i < 8; i++) await memberLoginAction({}, loginForm());
    expect(memberLoginThrottle.check(LOGIN_KEY).locked).toBe(true);
    expect((await memberLoginAction({}, loginForm())).error).toMatch(/^Too many attempts/);
  });

  it('a thrown call is reported as unavailable and logged by name only', async () => {
    auth.signInWithPassword.mockRejectedValue(new TypeError(`boom ${EMAIL}`));
    expect(await memberLoginAction({}, loginForm())).toEqual({ error: t.members.unavailable });
    expect(consoleError).toHaveBeenCalledWith('[auth]', {
      action: 'memberLogin',
      name: 'TypeError',
    });
    expect(memberLoginThrottle.check(LOGIN_KEY).locked).toBe(false);
  });
});

describe('forgotPasswordAction', () => {
  const run = () => forgotPasswordAction({}, form({ email: EMAIL }));

  it.each([
    ['email send interval', { status: 429, code: 'over_email_send_rate_limit' }],
    [
      'failed send',
      { status: 500, code: 'unexpected_failure', message: 'Error sending recovery email' },
    ],
  ])('%s answers like a sent email and logs only action, status and code', async (_n, error) => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: null, error });
    expect(await run()).toEqual({ done: true });
    expect(consoleError).toHaveBeenCalledWith('[auth]', {
      action: 'forgotPassword',
      status: error.status,
      code: error.code,
    });
    for (const call of consoleError.mock.calls) expect(JSON.stringify(call)).not.toContain(EMAIL);
  });

  it('a request rate limit says try later', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { status: 429, code: 'over_request_rate_limit' },
    });
    expect(await run()).toEqual({ error: t.members.tryLater });
  });
});

describe('registerAction', () => {
  const run = () => registerAction({}, registerForm());

  it('a failed send is told truthfully', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: {
        status: 500,
        code: 'unexpected_failure',
        message: 'Error sending confirmation email',
      },
    });
    expect(await run()).toEqual({ error: t.members.mailFailed });
  });

  it('the per-address email interval looks like success', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: { status: 429, code: 'over_email_send_rate_limit' },
    });
    expect(await run()).toEqual({ done: true });
  });

  it('an address already registered looks like success', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: { status: 422, code: 'user_already_exists', message: 'User already registered' },
    });
    expect(await run()).toEqual({ done: true });
  });

  it('every attempt is reserved before the call', async () => {
    auth.signUp.mockRejectedValue(new TypeError('fetch failed'));
    for (let i = 0; i < 5; i++) await run();
    expect(registerThrottle.check(IP).locked).toBe(true);
  });
});
