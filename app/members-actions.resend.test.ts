import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = { resend: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn() };
const request = { headers: new Headers({ 'x-real-ip': '198.51.100.7' }) };

vi.mock('next/headers', () => ({ headers: async () => request.headers }));
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
const {
  memberAccountThrottle,
  memberLoginThrottle,
  registerThrottle,
  resendEmailThrottle,
  resendThrottle,
} = await import('@/lib/auth/throttle');
const { memberLoginAction, registerAction, resendConfirmationAction } =
  await import('./members-actions');

const IP = '198.51.100.7';
const EMAIL = 'someone@example.test';
const PASSWORD = 'A-long-enough-password-1';
const NEUTRAL = { done: true };

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const resend = (email = EMAIL) => resendConfirmationAction({}, form({ email }));
const fail = (error: object) => ({ data: {}, error });

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  request.headers = new Headers({ 'x-real-ip': IP });
  for (const key of [IP, '203.0.113.1', '203.0.113.2', '203.0.113.3', '203.0.113.4', EMAIL]) {
    resendThrottle.reset(key);
    resendEmailThrottle.reset(key);
    registerThrottle.reset(key);
  }
  memberLoginThrottle.reset(`${IP}|${EMAIL}`);
  memberAccountThrottle.reset(EMAIL);
  vi.clearAllMocks();
  session.available = true;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe('resendConfirmationAction', () => {
  it('asks Supabase to send the sign-up email again, without a redirect of its own', async () => {
    auth.resend.mockResolvedValue({ data: {}, error: null });
    expect(await resend(' Someone@Example.test ')).toEqual(NEUTRAL);
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: EMAIL });
  });

  it.each([
    ['sent', null],
    ['unknown or already confirmed address', null],
    ['email send interval', { status: 429, code: 'over_email_send_rate_limit' }],
    ['failed send', { status: 500, code: 'unexpected_failure', message: 'Error sending email' }],
    ['some other refusal', { status: 422, code: 'validation_failed', message: 'nope' }],
  ])('%s gets the one neutral answer', async (_n, error) => {
    auth.resend.mockResolvedValue({ data: {}, error });
    // The same object every time, so nothing in the answer tells the outcomes apart.
    expect(await resend()).toStrictEqual(NEUTRAL);
  });

  it('a failed send is logged with action, status and code only', async () => {
    auth.resend.mockResolvedValue(
      fail({ status: 500, code: 'unexpected_failure', message: `Error sending to ${EMAIL}` }),
    );
    await resend();
    expect(consoleError).toHaveBeenCalledWith('[auth]', {
      action: 'resendConfirmation',
      status: 500,
      code: 'unexpected_failure',
    });
    for (const call of consoleError.mock.calls) expect(JSON.stringify(call)).not.toContain(EMAIL);
  });

  it('the request rate limit says try later and keeps the address', async () => {
    auth.resend.mockResolvedValue(fail({ status: 429, code: 'over_request_rate_limit' }));
    expect(await resend()).toEqual({ error: t.members.tryLater, values: { email: EMAIL } });
  });

  it('a bad address is refused and kept', async () => {
    expect(await resend('not-an-address')).toEqual({
      error: t.members.emailInvalid,
      values: { email: 'not-an-address' },
    });
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('no client, or a thrown call, is reported as unavailable', async () => {
    session.available = false;
    expect(await resend()).toMatchObject({ error: t.members.unavailable });
    session.available = true;
    auth.resend.mockRejectedValue(new TypeError(`boom ${EMAIL}`));
    expect(await resend()).toMatchObject({ error: t.members.unavailable });
    expect(consoleError).toHaveBeenCalledWith('[auth]', {
      action: 'resendConfirmation',
      name: 'TypeError',
    });
  });

  it('three a hour per address: the fourth is refused before Supabase is asked', async () => {
    auth.resend.mockRejectedValue(new TypeError('fetch failed'));
    for (let i = 0; i < 3; i++) await resend(`other-${i}@example.test`);
    expect(resendThrottle.check(IP).locked).toBe(true);
    auth.resend.mockClear();
    expect((await resend()).error).toMatch(/^Too many attempts/);
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('three a hour per email, whatever address the requests come from', async () => {
    auth.resend.mockResolvedValue({ data: {}, error: null });
    for (let i = 1; i <= 3; i++) {
      request.headers = new Headers({ 'x-real-ip': `203.0.113.${i}` });
      expect(await resend()).toEqual(NEUTRAL);
    }
    expect(resendEmailThrottle.check(EMAIL).locked).toBe(true);
    request.headers = new Headers({ 'x-real-ip': '203.0.113.4' });
    auth.resend.mockClear();
    expect(await resend()).toEqual({
      error: t.members.tooManyAttempts(60),
      values: { email: EMAIL },
    });
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('with no usable client address the first key falls back to the email', async () => {
    request.headers = new Headers();
    auth.resend.mockResolvedValue({ data: {}, error: null });
    for (let i = 0; i < 3; i++) await resend();
    expect(resendThrottle.check(EMAIL).locked).toBe(true);
    expect(resendThrottle.check(IP).locked).toBe(false);
  });
});

describe('registerAction tells the panel where the link went', () => {
  const run = () =>
    registerAction(
      {},
      form({ email: EMAIL, password: PASSWORD, displayName: 'Some One', acceptTerms: 'on' }),
    );

  it.each([
    ['created', null],
    [
      'already registered',
      { status: 422, code: 'user_already_exists', message: 'User already registered' },
    ],
    ['email send interval', { status: 429, code: 'over_email_send_rate_limit' }],
  ])('%s: done, with the address and never the password', async (_n, error) => {
    auth.signUp.mockResolvedValue({ data: {}, error });
    const result = await run();
    expect(result).toStrictEqual({ done: true, values: { email: EMAIL } });
    expect(JSON.stringify(result)).not.toContain(PASSWORD);
  });
});

describe('memberLoginAction flags an unconfirmed email', () => {
  it('so the form can offer to send the link again', async () => {
    auth.signInWithPassword.mockResolvedValue(fail({ status: 400, code: 'email_not_confirmed' }));
    expect(await memberLoginAction({}, form({ email: EMAIL, password: PASSWORD }))).toEqual({
      error: t.members.notConfirmed,
      unconfirmed: true,
      values: { email: EMAIL },
    });
  });
});

describe('copy', () => {
  it('the neutral answer and the register panel say what happened', () => {
    expect(t.members.resendDone).toBe(
      'If that address is waiting for confirmation, we sent a new link.',
    );
    expect(t.members.resendSubmit).toBe('Send the link again');
    const done = t.members.registerDone(EMAIL);
    expect(done).toContain(EMAIL);
    expect(done).toMatch(/spam/);
    expect(done).toMatch(/few minutes/);
  });
});
