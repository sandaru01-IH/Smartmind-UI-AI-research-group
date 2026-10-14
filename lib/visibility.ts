export type PostStatus = 'draft' | 'published';

export interface VisibilityFields {
  status: PostStatus;
  published_at: string | null;
}

/**
 * The single visibility rule. Mirrors the RLS policy in supabase/migrations:
 * status = 'published' AND published_at <= now().
 */
export function isPubliclyVisible(post: VisibilityFields, now: Date = new Date()): boolean {
  if (post.status !== 'published' || !post.published_at) return false;
  const at = Date.parse(post.published_at);
  return Number.isFinite(at) && at <= now.getTime();
}

export type PublicState = 'draft' | 'scheduled' | 'live';

export function publicState(post: VisibilityFields, now: Date = new Date()): PublicState {
  if (post.status === 'draft') return 'draft';
  return isPubliclyVisible(post, now) ? 'live' : 'scheduled';
}

/** Publishing with no date means "now". Drafts keep any date so a schedule survives unpublishing. */
export function resolvePublishedAt(
  status: PostStatus,
  publishedAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (publishedAt) return publishedAt;
  return status === 'published' ? now.toISOString() : null;
}
