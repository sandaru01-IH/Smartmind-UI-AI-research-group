import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { contrastRatio, parseThemeTokens, TOKEN_PAIRS } from './contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
  it('is 1 for identical colours', () => {
    expect(contrastRatio('#C6FF3D', '#c6ff3d')).toBeCloseTo(1, 5);
  });
  it('accepts short hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });
  it('throws on invalid colours', () => {
    expect(() => contrastRatio('red', '#000')).toThrow();
  });
});

describe('design tokens', () => {
  const css = readFileSync(path.resolve(__dirname, '../app/tokens.css'), 'utf8');
  const themes = parseThemeTokens(css);

  it('declares both themes', () => {
    expect(Object.keys(themes).sort()).toEqual(['dark', 'light']);
  });

  for (const theme of ['dark', 'light'] as const) {
    for (const pair of TOKEN_PAIRS) {
      if (pair.themes && pair.themes !== 'both' && pair.themes !== theme) continue;
      it(`${theme}: ${pair.label} meets ${pair.min}:1`, () => {
        const fg = themes[theme][pair.fg];
        const bg = themes[theme][pair.bg];
        expect(fg, `missing --${pair.fg}`).toBeDefined();
        expect(bg, `missing --${pair.bg}`).toBeDefined();
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  it('never uses the lime signal as text on the light background', () => {
    const textTokens = TOKEN_PAIRS.filter((p) => p.fg === 'signal' && p.bg === 'bg');
    expect(textTokens.every((p) => p.themes === 'dark')).toBe(true);
  });
});
