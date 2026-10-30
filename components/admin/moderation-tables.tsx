'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  setBlogCommentHiddenAction,
  setBlogPostHiddenAction,
  setMemberBlockedAction,
} from '@/app/admin/community-actions';
import type { AdminComment, AdminMember, AdminPost } from '@/lib/blog/admin';
import { formatDate } from '@/lib/format';
import { FlagSwitch } from './visibility-switch';

const TABS = [
  { href: '/admin/community', label: 'Posts' },
  { href: '/admin/community/comments', label: 'Comments' },
  { href: '/admin/community/members', label: 'Members' },
] as const;

/** Posts, Comments and Members: the three moderation lists. */
export function CommunityTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Community" className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center px-4 text-[0.95rem] ${active ? 'border-b-2 border-signal font-semibold' : 'text-muted hover:text-fg'}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

const th = 'label-mono px-3 py-2 text-left text-muted';
const td = 'px-3 py-3 align-top';

export function PostsTable({ posts }: { posts: AdminPost[] }) {
  if (posts.length === 0) return <p className="text-muted">No community posts yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.95rem]">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Post</th>
            <th className={th}>Writer</th>
            <th className={th}>Status</th>
            <th className={th}>Visibility</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <td className={td}>
                <span className="block max-w-[34ch] break-words">{p.title}</span>
                <span className="label-mono text-muted">{formatDate(p.createdAt)}</span>
                {p.status === 'published' && !p.hidden ? (
                  <Link
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    className="ml-3 text-[0.9rem] text-muted underline underline-offset-4 hover:text-fg"
                  >
                    View
                  </Link>
                ) : null}
              </td>
              <td className={td}>
                {p.authorName}
                {p.authorBlocked ? (
                  <span className="label-mono ml-2 text-danger">Blocked</span>
                ) : null}
              </td>
              <td className={td}>{p.status === 'published' ? 'Published' : 'Draft'}</td>
              <td className={td}>
                <FlagSwitch
                  initial={!p.hidden}
                  label={`Show post: ${p.title}`}
                  onLabel="Visible"
                  offLabel="Hidden"
                  save={(on) => setBlogPostHiddenAction(p.id, !on)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommentsTable({ comments }: { comments: AdminComment[] }) {
  if (comments.length === 0) return <p className="text-muted">No comments yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.95rem]">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Comment</th>
            <th className={th}>Writer</th>
            <th className={th}>On post</th>
            <th className={th}>Visibility</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((c) => (
            <tr key={c.id} className="border-b border-line">
              <td className={td}>
                <span className="block max-w-[44ch] whitespace-pre-wrap break-words">{c.body}</span>
                <span className="label-mono text-muted">{formatDate(c.createdAt)}</span>
              </td>
              <td className={td}>{c.authorName}</td>
              <td className={td}>
                <span className="block max-w-[26ch] break-words">
                  {c.postTitle ?? 'Deleted post'}
                </span>
              </td>
              <td className={td}>
                <FlagSwitch
                  initial={!c.hidden}
                  label={`Show comment by ${c.authorName}`}
                  onLabel="Visible"
                  offLabel="Hidden"
                  save={(on) => setBlogCommentHiddenAction(c.id, !on)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MembersTable({ members }: { members: AdminMember[] }) {
  if (members.length === 0) return <p className="text-muted">No members yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.95rem]">
        <thead>
          <tr className="border-b border-line">
            <th className={th}>Member</th>
            <th className={th}>Email</th>
            <th className={th}>Joined</th>
            <th className={th}>Allowed to post</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-line">
              <td className={td}>{m.displayName}</td>
              <td className={`${td} break-all`}>{m.email}</td>
              <td className={td}>
                <span className="label-mono text-muted">{formatDate(m.createdAt)}</span>
              </td>
              <td className={td}>
                <FlagSwitch
                  initial={!m.blocked}
                  label={`Allow ${m.displayName} to post`}
                  onLabel="Allowed"
                  offLabel="Blocked"
                  save={(on) => setMemberBlockedAction(m.id, !on)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
