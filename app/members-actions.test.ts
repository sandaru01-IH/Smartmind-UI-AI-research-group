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
const session = { available: true };
vi.mock('@/lib/supabase/server-client', () => ({
  createSessionClient: async () => (session.available ? { auth } : null),
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
  session.available = true;
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
      expect(await memberLoginAction({}, loginForm())).toMatchObject({ error: message });
    }
    expect(memberLoginThrottle.check(LOGIN_KEY).locked).toBe(false);
    expect(memberAccountThrottle.check(EMAIL).locked).toBe(false);
  });

  it('wrong credentials count, and lock the key after the limit', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
    });
    expect(await memberLoginAction({}, loginForm())).toMatchObject({
      error: t.members.loginFailed,
    });
    for (let i = 0; i < 8; i++) await memberLoginAction({}, loginForm());
    expect(memberLoginThrottle.check(LOGIN_KEY).locked).toBe(true);
    expect((await memberLoginAction({}, loginForm())).error).toMatch(/^Too many attempts/);
  });

  it('a thrown call is reported as unavailable and logged by name only', async () => {
    auth.signInWithPassword.mockRejectedValue(new TypeError(`boom ${EMAIL}`));
    expect(await memberLoginAction({}, loginForm())).toMatchObject({
      error: t.members.unavailable,
    });
    expect(consoleError).toHaveBeenCalledWith('[auth]', {
      action: 'memberLogin',
      name: 'TypeError',
    });
    expect(memberLoginThrottle.check(LOGIN_KEY).locked).toBe(false);
  });
});

const INTERVAL_MESSAGE = 'For security purposes, you can only request this after 52 seconds.';
const CAP_MESSAGE = 'email rate limit exceeded';

describe('forgotPasswordAction', () => {
  const run = () => forgotPasswordAction({}, form({ email: EMAIL }));

  it.each([
    [
      'email send interval',
      { status: 429, code: 'over_email_send_rate_limit', message: INTERVAL_MESSAGE },
    ],
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
    expect(await run()).toMatchObject({ error: t.members.tryLater });
  });

  it('the project-wide email cap says try later instead of "on its way"', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { status: 429, code: 'over_email_send_rate_limit', message: CAP_MESSAGE },
    });
    expect(await run()).toMatchObject({ error: t.members.tryLater });
  });

  it('an unreachable Supabase says unavailable instead of "on its way"', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { status: 0, name: 'AuthRetryableFetchError', message: 'fetch failed' },
    });
    expect(await run()).toMatchObject({ error: t.members.unavailable });
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
    expect(await run()).toMatchObject({ error: t.members.mailFailed });
  });

  it('the per-address email interval looks like success', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: { status: 429, code: 'over_email_send_rate_limit', message: INTERVAL_MESSAGE },
    });
    expect(await run()).toEqual({ done: true, values: { email: EMAIL } });
  });

  it('the project-wide email cap is told as try later, not as a sent email', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: { status: 429, code: 'over_email_send_rate_limit', message: CAP_MESSAGE },
    });
    expect(await run()).toMatchObject({ error: t.members.tryLater, values: expect.anything() });
  });

  it('an address already registered looks like success', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: { status: 422, code: 'user_already_exists', message: 'User already registered' },
    });
    expect(await run()).toEqual({ done: true, values: { email: EMAIL } });
  });

  it('every attempt is reserved before the call', async () => {
    auth.signUp.mockRejectedValue(new TypeError('fetch failed'));
    for (let i = 0; i < 5; i++) await run();
    expect(registerThrottle.check(IP).locked).toBe(true);
  });
});

describe('values echoed back so the form keeps what was typed', () => {
  const PASSWORD = 'A-long-enough-password-1';
  const typed = {
    register: { displayName: 'Some One', email: EMAIL, acceptTerms: 'on' },
    login: { email: EMAIL },
    forgot: { email: EMAIL },
  };
  const fail = (error: object) => ({ data: {}, error });

  type Run = () => Promise<{ values?: Record<string, string> }>;
  const cases: Record<string, [Run, Record<string, string>]> = {
    'register: validation failure': [
      () => registerAction({}, form({ ...typed.register, password: 'short' })),
      typed.register,
    ],
    'register: terms not ticked': [
      () => registerAction({}, form({ displayName: 'Some One', email: EMAIL, password: PASSWORD })),
      { displayName: 'Some One', email: EMAIL },
    ],
    'register: throttled': [
      async () => {
        for (let i = 0; i < 5; i++) registerThrottle.fail(IP);
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'register: unavailable (no client)': [
      async () => {
        session.available = false;
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'register: unavailable (thrown)': [
      async () => {
        auth.signUp.mockRejectedValue(new TypeError('fetch failed'));
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'register: try later': [
      async () => {
        auth.signUp.mockResolvedValue(fail({ status: 429, code: 'over_request_rate_limit' }));
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'register: mail failed': [
      async () => {
        auth.signUp.mockResolvedValue(
          fail({ status: 500, code: 'unexpected_failure', message: 'Error sending email' }),
        );
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'register: weak password': [
      async () => {
        auth.signUp.mockResolvedValue(fail({ status: 422, code: 'weak_password' }));
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'register: other failure': [
      async () => {
        auth.signUp.mockResolvedValue(fail({ status: 400, message: 'Something else' }));
        return registerAction({}, registerForm());
      },
      typed.register,
    ],
    'login: validation failure': [
      () => memberLoginAction({}, form({ email: EMAIL, password: '' })),
      typed.login,
    ],
    'login: throttled': [
      async () => {
        for (let i = 0; i < 9; i++) memberLoginThrottle.fail(LOGIN_KEY);
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'login: unavailable (no client)': [
      async () => {
        session.available = false;
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'login: unavailable (thrown)': [
      async () => {
        auth.signInWithPassword.mockRejectedValue(new TypeError('fetch failed'));
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'login: outage': [
      async () => {
        auth.signInWithPassword.mockResolvedValue(fail({ status: 503 }));
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'login: request rate limit': [
      async () => {
        auth.signInWithPassword.mockResolvedValue(fail({ status: 429 }));
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'login: unconfirmed': [
      async () => {
        auth.signInWithPassword.mockResolvedValue(
          fail({ status: 400, code: 'email_not_confirmed' }),
        );
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'login: wrong password': [
      async () => {
        auth.signInWithPassword.mockResolvedValue(
          fail({ status: 400, code: 'invalid_credentials' }),
        );
        return memberLoginAction({}, loginForm());
      },
      typed.login,
    ],
    'forgot: bad address': [
      () => forgotPasswordAction({}, form({ email: 'not-an-address' })),
      { email: 'not-an-address' },
    ],
    'forgot: throttled': [
      async () => {
        for (let i = 0; i < 9; i++) resetThrottle.fail(IP);
        return forgotPasswordAction({}, form({ email: EMAIL }));
      },
      typed.forgot,
    ],
    'forgot: unavailable (no client)': [
      async () => {
        session.available = false;
        return forgotPasswordAction({}, form({ email: EMAIL }));
      },
      typed.forgot,
    ],
    'forgot: unavailable (thrown)': [
      async () => {
        auth.resetPasswordForEmail.mockRejectedValue(new TypeError('fetch failed'));
        return forgotPasswordAction({}, form({ email: EMAIL }));
      },
      typed.forgot,
    ],
    'forgot: request rate limit': [
      async () => {
        auth.resetPasswordForEmail.mockResolvedValue(
          fail({ status: 429, code: 'over_request_rate_limit' }),
        );
        return forgotPasswordAction({}, form({ email: EMAIL }));
      },
      typed.forgot,
    ],
  };

  it.each(Object.keys(cases))('%s echoes the non-secret fields only', async (name) => {
    const [run, expected] = cases[name];
    const result = await run();
    expect(result).toHaveProperty('error');
    expect(result.values).toEqual(expected);
    // No password may ever travel back to the browser, whichever branch answered.
    const wire = JSON.stringify(result);
    for (const secret of [PASSWORD, 'whatever-password', 'short'])
      expect(wire, `${secret} leaked`).not.toContain(secret);
  });

  it('successful states carry no values, except the address a register link went to', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    auth.signUp.mockResolvedValue({ data: {}, error: null });
    expect(await forgotPasswordAction({}, form({ email: EMAIL }))).toEqual({ done: true });
    expect(await registerAction({}, registerForm())).toEqual({
      done: true,
      values: { email: EMAIL },
    });
  });
});

describe('pending labels', () => {
  it('forgot and reset do not say "Logging in"', () => {
    expect(t.members.forgotBusy).toBe('Sending');
    expect(t.members.resetBusy).toBe('Saving');
  });
});
