import { describe, expect, it } from 'vitest';
import { memberLoginSchema, registerSchema, resetPasswordSchema, safeMemberNext } from './schema';

const good = {
  email: 'Writer@Example.COM ',
  password: 'a-long-enough-password',
  displayName: '  Nimali Perera ',
  acceptTerms: true,
};

describe('registerSchema', () => {
  it('lower-cases the email and trims the display name', () => {
    const r = registerSchema.parse(good);
    expect(r.email).toBe('writer@example.com');
    expect(r.displayName).toBe('Nimali Perera');
  });

  it('rejects a password shorter than 12 characters', () => {
    expect(registerSchema.safeParse({ ...good, password: 'short-pass1' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...good, password: '12characters' }).success).toBe(true);
  });

  it('rejects when the terms are not accepted', () => {
    expect(registerSchema.safeParse({ ...good, acceptTerms: false }).success).toBe(false);
  });

  it('needs a display name of 2 to 80 characters and a real email', () => {
    expect(registerSchema.safeParse({ ...good, displayName: 'N' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...good, displayName: 'x'.repeat(81) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...good, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('memberLoginSchema and resetPasswordSchema', () => {
  it('accepts an email and any non-empty password on login', () => {
    expect(memberLoginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(memberLoginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });

  it('asks for the same 12-character minimum when resetting', () => {
    expect(resetPasswordSchema.safeParse({ password: 'short' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: 'a-long-enough-password' }).success).toBe(
      true,
    );
  });
});

describe('safeMemberNext', () => {
  it('keeps normal on-site paths', () => {
    expect(safeMemberNext('/write')).toBe('/write');
    expect(safeMemberNext('/blog/some-post?x=1')).toBe('/blog/some-post?x=1');
    expect(safeMemberNext('/account/posts')).toBe('/account/posts');
    expect(safeMemberNext('/')).toBe('/');
    expect(safeMemberNext('/account?tab=1#top')).toBe('/account?tab=1#top');
    expect(safeMemberNext('/blog/some-post')).toBe('/blog/some-post');
  });

  // Browsers strip tab/newline/CR while parsing, so '/\t/evil.example' becomes '//evil.example'.
  it.each(['/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/\u0000/x', '/a\u007Fb'])(
    'falls back for control characters in %j',
    (bad) => {
      expect(safeMemberNext(bad)).toBe('/');
    },
  );

  it('never returns anything that parses to another origin', () => {
    for (const input of [
      '/\t/evil.example',
      '/\n/evil.example',
      '/\r/evil.example',
      '/\u0000/x',
      '/​/x',
      '//evil.example',
      '/\\evil.example',
      '/..//evil',
      '/admin',
      '/admin?x=1',
      '/account?tab=1#top',
    ]) {
      const out = safeMemberNext(input);
      expect(new URL(out, 'http://site.test').origin, JSON.stringify(input)).toBe(
        'http://site.test',
      );
    }
  });

  it('keeps refusing /admin with a query string', () => {
    expect(safeMemberNext('/admin?x=1')).toBe('/');
  });

  it('falls back to the home page for anything that could leave the site or reach admin', () => {
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      '/admin',
      '/admin/posts',
      '/../etc',
      '',
      undefined,
      null,
      '/' + 'a'.repeat(400),
    ]) {
      expect(safeMemberNext(bad as string | null | undefined), String(bad)).toBe('/');
    }
  });
});
