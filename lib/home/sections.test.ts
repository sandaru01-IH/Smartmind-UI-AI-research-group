import { describe, expect, it } from 'vitest';
import { HOME_SECTION_IDS, resolveHomeSections } from './sections';

describe('resolveHomeSections', () => {
  it('turns every section on when there is nothing stored (demo mode, empty table)', () => {
    expect(resolveHomeSections(null)).toEqual({ video: true, medium: true, blog: true });
    expect(resolveHomeSections([])).toEqual({ video: true, medium: true, blog: true });
  });

  it('applies the stored switches', () => {
    const r = resolveHomeSections([
      { id: 'medium', enabled: false },
      { id: 'video', enabled: true },
    ]);
    expect(r).toEqual({ video: true, medium: false, blog: true });
  });

  it('ignores unknown ids and malformed rows', () => {
    const r = resolveHomeSections([
      { id: 'sidebar', enabled: false },
      { id: 'blog', enabled: 'no' },
      null,
      'blog',
    ]);
    expect(r).toEqual({ video: true, medium: true, blog: true });
  });

  it('lists exactly the three sections the admin can switch', () => {
    expect([...HOME_SECTION_IDS]).toEqual(['video', 'medium', 'blog']);
  });
});
