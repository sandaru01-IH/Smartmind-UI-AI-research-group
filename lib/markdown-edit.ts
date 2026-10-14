export type FormatKind = 'bold' | 'italic' | 'code' | 'h2' | 'ul' | 'ol' | 'quote' | 'link';

export interface EditResult {
  value: string;
  start: number;
  end: number;
}

function wrap(value: string, s: number, e: number, mark: string, placeholder: string): EditResult {
  const sel = value.slice(s, e);
  // Already wrapped just outside the selection: remove the marks.
  if (value.slice(s - mark.length, s) === mark && value.slice(e, e + mark.length) === mark && mark) {
    const next = value.slice(0, s - mark.length) + sel + value.slice(e + mark.length);
    return { value: next, start: s - mark.length, end: e - mark.length };
  }
  const inner = sel || placeholder;
  const next = value.slice(0, s) + mark + inner + mark + value.slice(e);
  return { value: next, start: s + mark.length, end: s + mark.length + inner.length };
}

function lineRange(value: string, s: number, e: number): [number, number] {
  const from = value.lastIndexOf('\n', s - 1) + 1;
  const nl = value.indexOf('\n', e);
  return [from, nl === -1 ? value.length : nl];
}

function prefixLines(value: string, s: number, e: number, make: (i: number) => string): EditResult {
  const [from, to] = lineRange(value, s, e);
  const lines = value.slice(from, to).split('\n');
  const block = lines.map((l, i) => make(i) + l).join('\n');
  return { value: value.slice(0, from) + block + value.slice(to), start: from, end: from + block.length };
}

/** Pure Markdown formatting for the editor toolbar. Positions are textarea selection offsets. */
export function applyFormat(value: string, s: number, e: number, kind: FormatKind): EditResult {
  switch (kind) {
    case 'bold':
      return wrap(value, s, e, '**', 'bold text');
    case 'italic':
      return wrap(value, s, e, '_', 'text');
    case 'code':
      return wrap(value, s, e, '`', 'code');
    case 'h2':
      return prefixLines(value, s, e, () => '## ');
    case 'ul':
      return prefixLines(value, s, e, () => '- ');
    case 'ol':
      return prefixLines(value, s, e, (i) => `${i + 1}. `);
    case 'quote':
      return prefixLines(value, s, e, () => '> ');
    case 'link': {
      const label = value.slice(s, e) || 'link text';
      const url = 'https://';
      const insert = `[${label}](${url})`;
      const next = value.slice(0, s) + insert + value.slice(e);
      const urlStart = s + label.length + 3;
      return { value: next, start: urlStart, end: urlStart + url.length };
    }
  }
}
