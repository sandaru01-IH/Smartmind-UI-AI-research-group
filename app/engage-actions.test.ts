import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMember = vi.fn();
const deleted = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/members/session', () => ({ getMember: () => getMember() }));

const { t } = await import('@/content/strings');
const { deleteCommentAction } = await import('./engage-actions');

const COMMENT = '3f1c0f44-8f2e-4b53-9a52-2c3a9d1d5a11';

beforeEach(() => {
  deleted.mockReset();
  getMember.mockResolvedValue({
    supabase: {
      from: () => ({
        delete: () => ({ eq: () => ({ select: async () => deleted() }) }),
      }),
    },
  });
});

describe('deleteCommentAction', () => {
  it('says ok when the comment was deleted', async () => {
    deleted.mockReturnValue({ data: [{ id: COMMENT }], error: null });
    expect(await deleteCommentAction(COMMENT, 'a-post')).toEqual({ ok: true });
  });

  it('does not claim a deletion when the row policy removed nothing (a hidden comment)', async () => {
    deleted.mockReturnValue({ data: [], error: null });
    expect(await deleteCommentAction(COMMENT, 'a-post')).toEqual({
      ok: false,
      message: t.blog.commentNotDeleted,
    });
  });

  it('reports a database error', async () => {
    deleted.mockReturnValue({ data: null, error: { message: 'boom' } });
    expect(await deleteCommentAction(COMMENT, 'a-post')).toMatchObject({ ok: false });
  });
});
