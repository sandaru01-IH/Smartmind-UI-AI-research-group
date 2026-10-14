import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { markdownSchema } from './markdown';

const render = (md: string) =>
  renderToStaticMarkup(
    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeSanitize, markdownSchema]]}>
      {md}
    </Markdown>,
  );

describe('markdown sanitising', () => {
  it('renders ordinary markdown', () => {
    const html = render('## Title\n\nSome **bold** text and a [link](https://example.org).');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://example.org"');
  });
  it('drops script tags and inline event handlers', () => {
    const html = render('<script>alert(1)</script><p onclick="alert(1)">hi</p>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onclick');
  });
  it('removes javascript: and data: links', () => {
    expect(render('[x](javascript:alert(1))')).not.toContain('javascript:');
    expect(render('[x](data:text/html;base64,AAAA)')).not.toContain('data:');
  });
  it('removes images and iframes', () => {
    expect(render('![a](https://example.org/a.png)')).not.toContain('<img');
    expect(render('<iframe src="https://example.org"></iframe>')).not.toContain('<iframe');
  });
  it('keeps tables from GFM', () => {
    expect(render('| a | b |\n| - | - |\n| 1 | 2 |')).toContain('<table');
  });
});
