export type ThemeName = 'dark' | 'light';
export type TokenMap = Record<string, string>;

export interface TokenPair {
  fg: string;
  bg: string;
  min: number;
  label: string;
  /** Themes the pair applies to. Defaults to both. */
  themes?: ThemeName | 'both';
}

/** Every text-on-surface and UI-on-surface pairing used by the site. */
export const TOKEN_PAIRS: TokenPair[] = [
  { fg: 'fg', bg: 'bg', min: 7, label: 'body text on page' },
  { fg: 'fg', bg: 'surface', min: 7, label: 'body text on raised surface' },
  { fg: 'muted', bg: 'bg', min: 4.5, label: 'secondary text on page' },
  { fg: 'muted', bg: 'surface', min: 4.5, label: 'secondary text on surface' },
  { fg: 'signal-fg', bg: 'signal', min: 7, label: 'button label on signal' },
  { fg: 'signal', bg: 'bg', min: 4.5, label: 'signal text on page', themes: 'dark' },
  { fg: 'focus', bg: 'bg', min: 3, label: 'focus ring on page' },
  { fg: 'focus', bg: 'surface', min: 3, label: 'focus ring on surface' },
  { fg: 'line-strong', bg: 'bg', min: 3, label: 'control border on page' },
  { fg: 'flood-ink', bg: 'bg', min: 4.5, label: 'flood label on page' },
  { fg: 'flood-ink', bg: 'surface', min: 4.5, label: 'flood label on surface' },
  { fg: 'landslide-ink', bg: 'bg', min: 4.5, label: 'landslide label on page' },
  { fg: 'landslide-ink', bg: 'surface', min: 4.5, label: 'landslide label on surface' },
  { fg: 'traffic-ink', bg: 'bg', min: 4.5, label: 'traffic label on page' },
  { fg: 'traffic-ink', bg: 'surface', min: 4.5, label: 'traffic label on surface' },
  { fg: 'ai-ink', bg: 'bg', min: 4.5, label: 'AI label on page' },
  { fg: 'ai-ink', bg: 'surface', min: 4.5, label: 'AI label on surface' },
  { fg: 'danger', bg: 'bg', min: 4.5, label: 'error text on page' },
  { fg: 'danger', bg: 'surface', min: 4.5, label: 'error text on surface' },
];

function parseHex(input: string): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!m) throw new Error(`Not a hex colour: ${input}`);
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function readBlock(css: string, selector: RegExp): TokenMap {
  const m = selector.exec(css);
  if (!m) return {};
  const body = m[1];
  const tokens: TokenMap = {};
  for (const decl of body.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    tokens[decl[1]] = decl[2];
  }
  return tokens;
}

/** Reads the `:root` (dark) and `[data-theme='light']` blocks of tokens.css. */
export function parseThemeTokens(css: string): Record<ThemeName, TokenMap> {
  const dark = readBlock(css, /:root\s*\{([^}]*)\}/);
  const light = { ...dark, ...readBlock(css, /\[data-theme='light'\]\s*\{([^}]*)\}/) };
  return { dark, light };
}
