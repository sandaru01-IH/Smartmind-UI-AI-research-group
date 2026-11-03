import { describe, expect, it } from 'vitest';
import { shouldPromote } from './create-admin-logic';

describe('shouldPromote', () => {
  it('creates an account when none exists, with or without --force', () => {
    expect(shouldPromote(null, false)).toBe('create');
    expect(shouldPromote(null, true)).toBe('create');
  });

  it('refuses to turn an existing non-admin account into an admin without --force', () => {
    expect(shouldPromote({ id: 'u1', isAdmin: false }, false)).toBe('refuse');
  });

  it('promotes an existing non-admin account only when --force is given', () => {
    expect(shouldPromote({ id: 'u1', isAdmin: false }, true)).toBe('update-admin');
  });

  it('resets the password of an existing admin without --force', () => {
    expect(shouldPromote({ id: 'u1', isAdmin: true }, false)).toBe('update-admin');
    expect(shouldPromote({ id: 'u1', isAdmin: true }, true)).toBe('update-admin');
  });
});
