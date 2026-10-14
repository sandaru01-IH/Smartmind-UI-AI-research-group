import { describe, expect, it } from 'vitest';
import { createThrottle } from './throttle';
import { safeNext } from './safe-next';
import { isValidUploadPath, newUploadPath } from '../upload-path';

describe('throttle', () => {
  const make = () => {
    let now = 1_000_000;
    const throttle = createThrottle({ maxFailures: 3, windowMs: 60_000, lockMs: 120_000, now: () => now });
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

describe('safeNext', () => {
  it('keeps admin paths', () => {
    expect(safeNext('/admin/posts/new')).toBe('/admin/posts/new');
    expect(safeNext('/admin?status=draft')).toBe('/admin?status=draft');
  });
  it.each([
    'https://evil.example/admin',
    '//evil.example',
    '/\\evil.example',
    '/news',
    'javascript:alert(1)',
    '/admin/../../etc',
    '',
    null,
    undefined,
  ])('falls back for %s', (v) => {
    expect(safeNext(v as string | null | undefined)).toBe('/admin');
  });
});

describe('upload paths', () => {
  it('builds valid paths per type', () => {
    expect(isValidUploadPath(newUploadPath('image/png', new Date('2026-10-14T00:00:00Z')))).toBe(true);
    expect(newUploadPath('image/jpeg', new Date('2026-10-14T00:00:00Z'))).toMatch(/^covers\/2026\/[0-9a-f-]{36}\.jpg$/);
  });
  it.each(['../x.png', 'covers/2026/x.png', 'covers/2026/../a.png', 'other/2026/00000000-0000-4000-8000-000000000000.png', 'covers/2026/00000000-0000-4000-8000-000000000000.svg'])(
    'rejects %s',
    (p) => expect(isValidUploadPath(p)).toBe(false),
  );
});
