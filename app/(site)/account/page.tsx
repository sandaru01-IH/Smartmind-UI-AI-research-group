import Link from 'next/link';
import { Suspense } from 'react';
import { MemberPage } from '@/components/members/member-page';
import { ProfileForm } from '@/components/members/profile-form';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({ title: 'Your account', description: 'Your account.', path: '/account' }),
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const changed = (Array.isArray(sp.password) ? sp.password[0] : sp.password) === 'changed';
  return (
    <MemberPage next="/account" title={t.blog.accountTitle} lead={t.blog.accountLead}>
      {(member) => (
        <>
          {changed ? (
            <p
              role="status"
              className="mb-8 border border-line-strong p-3 text-[0.95rem] text-muted"
            >
              {t.members.passwordChanged}
            </p>
          ) : null}
          <ProfileForm initial={member.profile} />
          <p className="mt-12 border-t border-line pt-6">
            <Link
              href="/account/delete"
              className="inline-flex min-h-11 items-center text-muted underline underline-offset-4 hover:text-fg"
            >
              {t.members.deleteLink}
            </Link>
          </p>
        </>
      )}
    </MemberPage>
  );
}

export default function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="container-site h-96 py-20" aria-busy="true" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}
