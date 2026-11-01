import { describe, expect, it } from 'vitest';
import { t } from '@/content/strings';
import { classifyAuthError, type AuthFailure } from './auth-errors';

describe('classifyAuthError', () => {
  it.each<[string, Parameters<typeof classifyAuthError>[0], AuthFailure]>([
    ['null', null, 'other'],
    ['request rate limit', { status: 429, code: 'over_request_rate_limit' }, 'rate_limited'],
    ['email send rate limit', { status: 429, code: 'over_email_send_rate_limit' }, 'rate_limited'],
    ['rate-limit code without a status', { code: 'over_request_rate_limit' }, 'rate_limited'],
    ['bare 429', { status: 429, message: 'Too many requests' }, 'rate_limited'],
    ['500', { status: 500, message: 'Internal error' }, 'send_failed'],
    ['503', { status: 503 }, 'send_failed'],
    ['unexpected_failure', { status: 400, code: 'unexpected_failure' }, 'send_failed'],
    ['email not authorised', { status: 400, code: 'email_address_not_authorized' }, 'send_failed'],
    [
      'sending email message',
      { status: 400, message: 'Error sending confirmation email' },
      'send_failed',
    ],
    ['sending recovery email', { message: 'Error sending recovery email' }, 'send_failed'],
    ['weak password', { status: 422, code: 'weak_password' }, 'weak_password'],
    ['same password', { status: 422, code: 'same_password' }, 'same_password'],
    ['email not confirmed', { status: 400, code: 'email_not_confirmed' }, 'not_confirmed'],
    ['invalid credentials', { status: 400, code: 'invalid_credentials' }, 'bad_credentials'],
    ['already registered', { status: 422, code: 'user_already_exists' }, 'other'],
    ['empty object', {}, 'other'],
  ])('%s', (_name, e, expected) => {
    expect(classifyAuthError(e)).toBe(expected);
  });
});

describe('t.members.tooManyAttempts', () => {
  it.each([
    [1, 'Too many attempts. Try again in 1 minute.'],
    [2, 'Too many attempts. Try again in 2 minutes.'],
    [15, 'Too many attempts. Try again in 15 minutes.'],
  ])('%i', (minutes, expected) => {
    expect(t.members.tooManyAttempts(minutes)).toBe(expected);
  });
});
