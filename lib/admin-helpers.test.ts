import { describe, expect, it } from 'vitest';
import { applyFormat } from './markdown-edit';
import { fromLocalInput, toLocalInput } from './datetime';

describe('applyFormat', () => {
  it('wraps a selection in bold', () => {
    const r = applyFormat('hello world', 6, 11, 'bold');
    expect(r.value).toBe('hello **world**');
    expect(r.value.slice(r.start, r.end)).toBe('world');
  });
  it('inserts placeholder text when nothing is selected', () => {
    const r = applyFormat('', 0, 0, 'italic');
    expect(r.value).toBe('_text_');
    expect(r.value.slice(r.start, r.end)).toBe('text');
  });
  it('toggles bold off when already wrapped', () => {
    const r = applyFormat('**word**', 2, 6, 'bold');
    expect(r.value).toBe('word');
  });
  it('turns the current line into a heading', () => {
    const r = applyFormat('intro\nTitle here\nmore', 8, 8, 'h2');
    expect(r.value).toBe('intro\n## Title here\nmore');
  });
  it('prefixes every selected line for lists and quotes', () => {
    expect(applyFormat('a\nb', 0, 3, 'ul').value).toBe('- a\n- b');
    expect(applyFormat('a\nb', 0, 3, 'quote').value).toBe('> a\n> b');
    expect(applyFormat('a\nb', 0, 3, 'ol').value).toBe('1. a\n2. b');
  });
  it('builds a link around the selection and selects the url', () => {
    const r = applyFormat('see docs', 4, 8, 'link');
    expect(r.value).toBe('see [docs](https://)');
    expect(r.value.slice(r.start, r.end)).toBe('https://');
  });
  it('wraps code', () => {
    expect(applyFormat('x', 0, 1, 'code').value).toBe('`x`');
  });
});

describe('datetime-local conversion', () => {
  it('round-trips an instant', () => {
    const iso = '2026-12-01T09:30:00.000Z';
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
  it('handles empty values', () => {
    expect(toLocalInput(null)).toBe('');
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('garbage')).toBeNull();
  });
  it('formats as YYYY-MM-DDTHH:mm', () => {
    expect(toLocalInput('2026-12-01T09:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
