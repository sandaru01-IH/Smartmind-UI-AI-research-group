import type { ReactNode } from 'react';
import Link from 'next/link';
import { ToastProvider } from '@/components/admin/toast';
import { t } from '@/content/strings';
import { hasSupabase } from '@/lib/supabase/env';
import { requireMember, type MemberContext } from '@/lib/members/session';

/**
 * Frame for the signed-in pages (write, my posts, account). Sends visitors to the login page and
 * explains when the email is not confirmed yet. Toasts are available to everything inside.
 */
export async function MemberPage({
  next,
  title,
  lead,
  needsVerified = false,
  children,
}: {
  next: string;
  title: string;
  lead?: string;
  /** Show `children` only for a member who may post; otherwise show the reason. */
  needsVerified?: boolean;
  children: (member: MemberContext) => ReactNode;
}) {
  if (!hasSupabase()) {
    return (
      <div className="container-site py-14 md:py-24">
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        <p className="mt-4 text-muted">{t.members.disabled}</p>
      </div>
    );
  }
  const member = await requireMember(next);
  const blocked = needsVerified && member.profile.blocked;
  const unverified = needsVerified && !member.verified;
  return (
    <ToastProvider>
      <div className="container-site py-14 md:py-20">
        <div className="mx-auto w-full max-w-3xl">
          <nav
            aria-label={t.members.accountMenu}
            className="mb-8 flex flex-wrap gap-x-6 text-[0.95rem]"
          >
            <Link
              href="/write"
              className="inline-flex min-h-11 items-center text-muted hover:text-fg"
            >
              {t.members.write}
            </Link>
            <Link
              href="/account/posts"
              className="inline-flex min-h-11 items-center text-muted hover:text-fg"
            >
              {t.members.myPosts}
            </Link>
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center text-muted hover:text-fg"
            >
              {t.members.account}
            </Link>
          </nav>
          <h1 className="text-3xl md:text-4xl">{title}</h1>
          {lead ? <p className="mt-3 text-lg text-muted">{lead}</p> : null}
          <div className="mt-8">
            {blocked ? (
              <p role="status" className="border border-line-strong p-4 text-muted">
                {t.blog.blocked}
              </p>
            ) : unverified ? (
              <p role="status" className="border border-line-strong p-4 text-muted">
                {t.blog.verifyBanner}
              </p>
            ) : (
              children(member)
            )}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
