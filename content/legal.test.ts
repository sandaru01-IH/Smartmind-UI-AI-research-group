import { describe, expect, it } from 'vitest';
import { PRIVACY, TERMS } from './legal';

const text = (sections: { heading: string; body: string[] }[]) =>
  sections
    .flatMap((s) => [s.heading, ...s.body])
    .join('\n')
    .toLowerCase();

describe('draft legal pages', () => {
  it('both documents have sections, each with a heading and some text', () => {
    for (const doc of [TERMS, PRIVACY]) {
      expect(doc.sections.length).toBeGreaterThanOrEqual(5);
      for (const s of doc.sections) {
        expect(s.heading.trim()).not.toBe('');
        expect(s.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('are marked as drafts that the team must review before launch', () => {
    expect(TERMS.draftNotice).toMatch(/draft/i);
    expect(PRIVACY.draftNotice).toMatch(/review/i);
  });

  it('the terms say the admin can hide content and block accounts', () => {
    const t = text(TERMS.sections);
    expect(t).toContain('hide');
    expect(t).toContain('block');
  });

  it('the privacy notice says what is collected, who sees it and how to delete the account', () => {
    const p = text(PRIVACY.sections);
    for (const word of ['email', 'name', 'photo', 'posts', 'comments', 'likes']) {
      expect(p, word).toContain(word);
    }
    expect(p).toContain('delete your account');
    expect(p).toContain('former member');
  });
});
