import { describe, expect, it } from 'vitest';
import { isRecentRecovery } from './recovery-session';

const NOW = 1_793_502_526;

describe('isRecentRecovery', () => {
  it.each([
    // The shape local GoTrue puts in the claims right after a recovery verifyOtp.
    ['fresh otp, as GoTrue issues it', [{ method: 'otp', timestamp: NOW }], true],
    ['otp 14 minutes old', [{ method: 'otp', timestamp: NOW - 14 * 60 }], true],
    ['otp exactly 15 minutes old', [{ method: 'otp', timestamp: NOW - 900 }], true],
    ['otp just over 15 minutes old', [{ method: 'otp', timestamp: NOW - 901 }], false],
    ['fresh recovery method', [{ method: 'recovery', timestamp: NOW - 10 }], true],
    ['password login', [{ method: 'password', timestamp: NOW }], false],
    [
      'password login with an old otp beside it',
      [
        { method: 'password', timestamp: NOW },
        { method: 'otp', timestamp: NOW - 3600 },
      ],
      false,
    ],
    [
      'password and a fresh otp',
      [
        { method: 'password', timestamp: NOW - 3600 },
        { method: 'otp', timestamp: NOW - 5 },
      ],
      true,
    ],
    // The auth server's clock can run a little ahead of this one.
    ['a few seconds in the future', [{ method: 'otp', timestamp: NOW + 5 }], true],
    ['far in the future', [{ method: 'otp', timestamp: NOW + 901 }], false],
    ['timestamp as a string', [{ method: 'otp', timestamp: String(NOW) }], false],
    ['no timestamp', [{ method: 'otp' }], false],
    ['empty array', [], false],
    ['missing', undefined, false],
    ['null', null, false],
    ['a string', 'otp', false],
    ['an object, not an array', { method: 'otp', timestamp: NOW }, false],
    ['array of garbage', [null, 1, 'otp', ['otp', NOW]], false],
  ])('%s', (_name, amr, expected) => {
    expect(isRecentRecovery(amr, NOW)).toBe(expected);
  });

  it('honours a shorter max age', () => {
    expect(isRecentRecovery([{ method: 'otp', timestamp: NOW - 120 }], NOW, 60)).toBe(false);
    expect(isRecentRecovery([{ method: 'otp', timestamp: NOW - 30 }], NOW, 60)).toBe(true);
  });
});
