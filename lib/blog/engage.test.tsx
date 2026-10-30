import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommentList } from '@/components/blog/comment-list';
import { commentInputSchema, parseComments } from './engage';

describe('commentInputSchema', () => {
  it('trims the text', () => {
    expect(commentInputSchema.parse({ body: '  Nice post  ' }).body).toBe('Nice post');
  });

  it('rejects an empty or whitespace-only comment', () => {
    expect(commentInputSchema.safeParse({ body: '' }).success).toBe(false);
    expect(commentInputSchema.safeParse({ body: '   \n  ' }).success).toBe(false);
  });

  it('allows up to 2,000 characters and no more', () => {
    expect(commentInputSchema.safeParse({ body: 'x'.repeat(2000) }).success).toBe(true);
    expect(commentInputSchema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('parseComments', () => {
  const row = (extra: Record<string, unknown> = {}) => ({
    id: 'c1',
    post_id: 'p1',
    body: 'Hello',
    created_at: '2026-10-02T10:00:00+00:00',
    author_id: 'u1',
    author: { id: 'u1', display_name: 'Ada', photo_path: null },
    ...extra,
  });

  it('maps rows, oldest first as given', () => {
    const [c] = parseComments([row()]);
    expect(c).toMatchObject({
      id: 'c1',
      postId: 'p1',
      body: 'Hello',
      author: { id: 'u1', displayName: 'Ada', photoPath: null },
    });
  });

  it('keeps a comment whose writer deleted their account, with no author', () => {
    const [c] = parseComments([row({ author: null, author_id: null })]);
    expect(c.author).toBeNull();
  });
});

describe('CommentList', () => {
  const comments = parseComments([
    {
      id: 'c1',
      post_id: 'p1',
      body: '<script>alert(1)</script> <b>bold</b> https://example.org\nsecond line',
      created_at: '2026-10-02T10:00:00+00:00',
      author_id: 'u1',
      author: { id: 'u1', display_name: 'Ada', photo_path: null },
    },
  ]);

  const html = (viewer: { memberId: string | null }, postAuthorId = 'owner') =>
    renderToStaticMarkup(
      <CommentList
        comments={comments}
        viewerId={viewer.memberId}
        postAuthorId={postAuthorId}
        onDelete={() => {}}
      />,
    );

  it('shows a comment as plain text: tags are escaped and links are not clickable', () => {
    const out = html({ memberId: null });
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<b>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toContain('<a ');
    expect(out).toContain('whitespace-pre-wrap');
  });

  it('offers delete to the comment author and to the post author, and to nobody else', () => {
    expect(html({ memberId: 'u1' })).toContain('Delete comment');
    expect(html({ memberId: 'owner' })).toContain('Delete comment');
    expect(html({ memberId: 'someone-else' })).not.toContain('Delete comment');
    expect(html({ memberId: null })).not.toContain('Delete comment');
  });

  it('names a deleted account "Former member"', () => {
    const gone = parseComments([
      {
        id: 'c2',
        post_id: 'p1',
        body: 'Hi',
        created_at: '2026-10-02T10:00:00+00:00',
        author_id: null,
        author: null,
      },
    ]);
    const out = renderToStaticMarkup(
      <CommentList comments={gone} viewerId={null} postAuthorId="owner" onDelete={() => {}} />,
    );
    expect(out).toContain('Former member');
  });
});
