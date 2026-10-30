'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { addCommentAction, deleteCommentAction, toggleLikeAction } from '@/app/engage-actions';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { COMMENT_MAX, type BlogComment } from '@/lib/blog/engage';
import { CommentList } from './comment-list';

interface Viewer {
  signedIn: boolean;
  memberId?: string;
  canPost?: boolean;
  verified?: boolean;
  blocked?: boolean;
  liked?: boolean;
}

const ViewerContext = createContext<{ viewer: Viewer | undefined; postId: string; slug: string }>({
  viewer: undefined,
  postId: '',
  slug: '',
});

/**
 * Asks the server who is looking at this post (signed in? may comment? already liked?) so the post
 * page itself can stay cached. Everything inside reads the answer from here.
 */
export function ViewerProvider({
  postId,
  slug,
  children,
}: {
  postId: string;
  slug: string;
  children: ReactNode;
}) {
  const [viewer, setViewer] = useState<Viewer | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetch(`/api/blog/viewer?post=${encodeURIComponent(postId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Viewer>) : { signedIn: false }))
      .then((v) => live && setViewer(v))
      .catch(() => live && setViewer({ signedIn: false }));
    return () => {
      live = false;
    };
  }, [postId]);
  return (
    <ViewerContext.Provider value={{ viewer, postId, slug }}>{children}</ViewerContext.Provider>
  );
}

const loginHref = (slug: string) => `/login?next=${encodeURIComponent(`/blog/${slug}`)}`;

/** A heart with the count. Signed-out visitors are pointed to the login page. */
export function LikeButton({ initialCount }: { initialCount: number }) {
  const { viewer, postId, slug } = useContext(ViewerContext);
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isLiked = liked ?? viewer?.liked ?? false;

  const inner = (
    <>
      <Heart size={16} aria-hidden="true" fill={isLiked ? 'currentColor' : 'none'} />
      <span>{count}</span>
    </>
  );
  const cls =
    'inline-flex min-h-11 items-center gap-1.5 rounded-sharp px-2 text-muted hover:text-fg';

  if (viewer && !viewer.signedIn) {
    return (
      <Link href={loginHref(slug)} className={cls} aria-label={`${t.blog.loginToLike} (${count})`}>
        {inner}
      </Link>
    );
  }
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={isLiked}
        aria-label={`${isLiked ? t.blog.unlike : t.blog.like} (${count})`}
        disabled={pending || !viewer || viewer.canPost === false}
        title={viewer && viewer.canPost === false ? t.blog.needVerifyShort : undefined}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await toggleLikeAction(postId);
            if (!r.ok) return setError(r.message);
            setLiked(r.data.liked);
            setCount(r.data.likeCount);
          })
        }
        className={`${cls} ${isLiked ? 'text-fg' : ''}`}
      >
        {inner}
      </button>
      {error ? (
        <span role="alert" className="text-[0.85rem] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** The comments on a post, with the form to add one. */
export function Comments({
  comments,
  postAuthorId,
}: {
  comments: BlogComment[];
  postAuthorId: string | null;
}) {
  const { viewer, postId, slug } = useContext(ViewerContext);
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const submit = () =>
    start(async () => {
      setError(null);
      setNotice(null);
      const r = await addCommentAction(postId, body);
      if (!r.ok) return setError(r.message);
      setBody('');
      setNotice(t.blog.commentPosted);
      router.refresh();
    });

  const remove = (id: string) => {
    setBusyId(id);
    start(async () => {
      const r = await deleteCommentAction(id, slug);
      setBusyId(null);
      if (!r.ok) return setError(r.message);
      setNotice(t.blog.commentDeleted);
      router.refresh();
    });
  };

  return (
    <section aria-labelledby="comments-heading" className="mt-14 max-w-[70ch]">
      <h2 id="comments-heading" className="text-2xl">
        {t.blog.commentsTitle} <span className="text-muted">({comments.length})</span>
      </h2>
      <div className="mt-6">
        <CommentList
          comments={comments}
          viewerId={viewer?.memberId ?? null}
          postAuthorId={postAuthorId}
          onDelete={remove}
          busyId={busyId}
        />
      </div>
      <div className="mt-8">
        {!viewer ? null : !viewer.signedIn ? (
          <p>
            <Link href={loginHref(slug)} className={buttonClass('secondary')}>
              {t.blog.loginToComment}
            </Link>
          </p>
        ) : viewer.canPost ? (
          <form
            className="space-y-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor="comment-body" className="label-mono block text-muted">
              {t.blog.commentLabel}
            </label>
            <textarea
              id="comment-body"
              rows={4}
              value={body}
              maxLength={COMMENT_MAX}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-sharp border border-line-strong bg-surface p-3 text-base text-fg"
            />
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className={buttonClass('primary')}
            >
              {pending ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : null}
              {t.blog.commentSubmit}
            </button>
          </form>
        ) : (
          <p role="status" className="border border-line-strong p-4 text-muted">
            {viewer.blocked ? t.blog.blocked : t.blog.needVerifyShort}
          </p>
        )}
        <div aria-live="polite" className="mt-2 min-h-6">
          {error ? (
            <p className="text-danger">{error}</p>
          ) : notice ? (
            <p className="text-muted">{notice}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
