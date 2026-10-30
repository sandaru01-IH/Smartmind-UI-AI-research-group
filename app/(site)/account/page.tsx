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

async function Content() {
  return (
    <MemberPage next="/account" title={t.blog.accountTitle} lead={t.blog.accountLead}>
      {(member) => (
        <>
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

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="container-site h-96 py-20" aria-busy="true" />}>
      <Content />
    </Suspense>
  );
}
