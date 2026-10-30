import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlogBody } from '@/components/blog/blog-body';
import { isValidMemberUploadPath, newMemberUploadPath } from '@/lib/upload-path';

const PREFIX = 'https://project.supabase.co/storage/v1/object/public/media/members/';
const render = (md: string) => renderToStaticMarkup(<BlogBody md={md} imagePrefix={PREFIX} />);

describe('community post rendering', () => {
  it('renders ordinary writing: headings, emphasis, lists, quotes and links', () => {
    const html = render(
      '## Title\n\nSome **bold** text.\n\n- one\n- two\n\n> quote\n\n[site](https://example.org)',
    );
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('href="https://example.org"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('removes scripts, inline handlers, iframes and raw html', () => {
    const html = render(
      '<script>alert(1)</script><p onclick="alert(1)">hi</p><iframe src="https://evil.example"></iframe><style>*{}</style>',
    );
    expect(html).not.toMatch(/<script|<iframe|<style|onclick/);
  });

  it('removes javascript: and data: links', () => {
    expect(render('[x](javascript:alert(1))')).not.toContain('javascript:');
    expect(render('[x](data:text/html;base64,AAAA)')).not.toContain('data:');
  });

  it('keeps an image uploaded to the site', () => {
    const html = render(`![A city](${PREFIX}user-1/a.png)`);
    expect(html).toContain(`src="${PREFIX}user-1/a.png"`);
    expect(html).toContain('alt="A city"');
  });

  it('drops an image from anywhere else, including look-alike addresses', () => {
    for (const src of [
      'https://evil.example/x.png',
      'http://project.supabase.co/storage/v1/object/public/media/members/x.png',
      `${PREFIX.replace('project', 'project.evil')}x.png`,
      'https://project.supabase.co/storage/v1/object/public/media/covers/x.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
    ]) {
      expect(render(`![x](${src})`), src).not.toContain('<img');
    }
  });

  it('shows no images at all when the site has no storage address', () => {
    const html = renderToStaticMarkup(
      <BlogBody md={`![x](${PREFIX}u/a.png)`} imagePrefix={null} />,
    );
    expect(html).not.toContain('<img');
  });
});

describe('member upload paths', () => {
  const uid = '0b1c2d3e-0000-4000-8000-000000000001';

  it('puts each member in their own folder', () => {
    const path = newMemberUploadPath(uid, 'image/png');
    expect(path).toMatch(new RegExp(`^members/${uid}/[0-9a-f-]{36}\\.png$`));
    expect(isValidMemberUploadPath(path, uid)).toBe(true);
  });

  it('rejects another member, traversal and wrong folders', () => {
    const path = newMemberUploadPath(uid, 'image/webp');
    expect(isValidMemberUploadPath(path, '0b1c2d3e-0000-4000-8000-000000000002')).toBe(false);
    expect(isValidMemberUploadPath(`members/${uid}/../x.png`, uid)).toBe(false);
    expect(isValidMemberUploadPath(`covers/2026/${path.split('/')[2]}`, uid)).toBe(false);
    expect(isValidMemberUploadPath(`members/${uid}/a.png`, uid)).toBe(false);
  });
});
