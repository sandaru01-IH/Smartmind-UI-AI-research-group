import { describe, expect, it } from 'vitest';
import { createThrottle, passwordChangeThrottle } from './throttle';
import { safeNext } from './safe-next';
import { isValidUploadPath, newUploadPath } from '../upload-path';

describe('throttle', () => {
  const make = () => {
    let now = 1_000_000;
    const throttle = createThrottle({
      maxFailures: 3,
      windowMs: 60_000,
      lockMs: 120_000,
      now: () => now,
    });
    return { throttle, advance: (ms: number) => (now += ms) };
  };

  it('allows attempts under the limit', () => {
    const { throttle } = make();
    throttle.fail('a');
    throttle.fail('a');
    expect(throttle.check('a').locked).toBe(false);
  });
  it('locks after too many failures and reports retry time', () => {
    const { throttle } = make();
    for (let i = 0; i < 3; i++) throttle.fail('a');
    const c = throttle.check('a');
    expect(c.locked).toBe(true);
    expect(c.retryAfterSeconds).toBe(120);
  });
  it('keys are independent', () => {
    const { throttle } = make();
    for (let i = 0; i < 3; i++) throttle.fail('a');
    expect(throttle.check('b').locked).toBe(false);
  });
  it('unlocks after the lock period', () => {
    const { throttle, advance } = make();
    for (let i = 0; i < 3; i++) throttle.fail('a');
    advance(120_001);
    expect(throttle.check('a').locked).toBe(false);
  });
  it('forgets old failures outside the window', () => {
    const { throttle, advance } = make();
    throttle.fail('a');
    throttle.fail('a');
    advance(61_000);
    throttle.fail('a');
    expect(throttle.check('a').locked).toBe(false);
  });
  it('reset clears the record on success', () => {
    const { throttle } = make();
    throttle.fail('a');
    throttle.fail('a');
    throttle.reset('a');
    throttle.fail('a');
    expect(throttle.check('a').locked).toBe(false);
  });
});

describe('throttle memory', () => {
  const make = (maxKeys?: number) => {
    let now = 1_000_000;
    const throttle = createThrottle({
      maxFailures: 3,
      windowMs: 60_000,
      lockMs: 120_000,
      maxKeys,
      now: () => now,
    });
    return { throttle, advance: (ms: number) => (now += ms) };
  };

  it('forgets keys whose only failures are older than the window', () => {
    const { throttle, advance } = make();
    for (let i = 0; i < 6000; i++) throttle.fail(`stale-${i}`);
    advance(61_000);
    throttle.fail('fresh');
    expect(throttle.size()).toBeLessThan(10);
  });

  it('never holds more than the cap, even when every key is recent', () => {
    const { throttle } = make();
    for (let i = 0; i < 6000; i++) throttle.fail(`recent-${i}`);
    expect(throttle.size()).toBeLessThanOrEqual(5000);
  });

  it('keeps a locked key through a flood of other keys, until the lock ends', () => {
    const { throttle, advance } = make();
    for (let i = 0; i < 3; i++) throttle.fail('victim');
    for (let i = 0; i < 6000; i++) throttle.fail(`noise-${i}`);
    expect(throttle.check('victim').locked).toBe(true);
    advance(121_000);
    expect(throttle.check('victim').locked).toBe(false);
    throttle.fail('after');
    expect(throttle.size()).toBeLessThan(10);
  });

  it('drops the oldest key first when over the cap', () => {
    const { throttle } = make(3);
    for (const k of ['a', 'b', 'c', 'd']) throttle.fail(k);
    expect(throttle.size()).toBe(3);
    // `a` was forgotten, so two more failures are only its second and third: not yet locked.
    throttle.fail('a');
    expect(throttle.check('a').locked).toBe(false);
    // `d` was kept: its second and third failures lock it.
    throttle.fail('d');
    throttle.fail('d');
    expect(throttle.check('d').locked).toBe(true);
  });

  it('a key that fails again counts as recent and outlives older keys', () => {
    const { throttle } = make(3);
    throttle.fail('a');
    throttle.fail('b');
    throttle.fail('c');
    throttle.fail('a');
    throttle.fail('d');
    // `b` was the oldest after `a` was touched again.
    throttle.fail('b');
    throttle.fail('b');
    expect(throttle.check('b').locked).toBe(false);
    throttle.fail('a');
    expect(throttle.check('a').locked).toBe(true);
  });

  it('only a full table of locked keys can push out a locked key, oldest first', () => {
    const { throttle } = make(2);
    for (const k of ['x', 'y']) for (let i = 0; i < 3; i++) throttle.fail(k);
    for (let i = 0; i < 3; i++) throttle.fail('z');
    expect(throttle.size()).toBe(2);
    expect(throttle.check('x').locked).toBe(false);
    expect(throttle.check('y').locked).toBe(true);
    expect(throttle.check('z').locked).toBe(true);
  });
});

describe('passwordChangeThrottle', () => {
  it('allows 5 password changes per user, then locks that user for an hour', () => {
    const key = 'user-throttle-test';
    for (let i = 0; i < 4; i++) passwordChangeThrottle.fail(key);
    expect(passwordChangeThrottle.check(key).locked).toBe(false);
    passwordChangeThrottle.fail(key);
    const c = passwordChangeThrottle.check(key);
    expect(c.locked).toBe(true);
    expect(c.retryAfterSeconds).toBeGreaterThan(59 * 60);
    expect(c.retryAfterSeconds).toBeLessThanOrEqual(60 * 60);
    expect(passwordChangeThrottle.check('another-user').locked).toBe(false);
    passwordChangeThrottle.reset(key);
  });
});

describe('safeNext', () => {
  it('keeps admin paths', () => {
    expect(safeNext('/admin/posts/new')).toBe('/admin/posts/new');
    expect(safeNext('/admin?status=draft')).toBe('/admin?status=draft');
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/admin/posts/1?x=1')).toBe('/admin/posts/1?x=1');
    expect(safeNext('/admin?x=1')).toBe('/admin?x=1');
  });
  it('never returns anything that parses to another origin', () => {
    for (const input of [
      '/admin/\t/evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r/evil.example',
      '/\u0000/x',
      '/admin\t',
      '/admin/​/x',
      '//evil.example',
      '/\\evil.example',
      '/..//evil',
      '/admin?x=1',
    ]) {
      const out = safeNext(input);
      expect(new URL(out, 'http://site.test').origin, JSON.stringify(input)).toBe(
        'http://site.test',
      );
    }
  });
  it.each([
    'https://evil.example/admin',
    '//evil.example',
    '/\\evil.example',
    '/news',
    'javascript:alert(1)',
    '/admin/../../etc',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '/\u0000/x',
    '/admin\t/x',
    '/admin/\t/evil.example',
    '',
    null,
    undefined,
  ])('falls back for %s', (v) => {
    expect(safeNext(v as string | null | undefined)).toBe('/admin');
  });
});

describe('upload paths', () => {
  it('builds valid paths per type', () => {
    expect(isValidUploadPath(newUploadPath('image/png', new Date('2026-10-14T00:00:00Z')))).toBe(
      true,
    );
    expect(newUploadPath('image/jpeg', new Date('2026-10-14T00:00:00Z'))).toMatch(
      /^covers\/2026\/[0-9a-f-]{36}\.jpg$/,
    );
  });
  it.each([
    '../x.png',
    'covers/2026/x.png',
    'covers/2026/../a.png',
    'other/2026/00000000-0000-4000-8000-000000000000.png',
    'covers/2026/00000000-0000-4000-8000-000000000000.svg',
  ])('rejects %s', (p) => expect(isValidUploadPath(p)).toBe(false));
});
