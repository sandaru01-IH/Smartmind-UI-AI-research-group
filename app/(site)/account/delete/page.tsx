import { Suspense } from 'react';
import { DeleteAccountForm } from '@/components/members/delete-account-form';
import { MemberPage } from '@/components/members/member-page';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({
    title: 'Delete your account',
    description: 'Delete your account.',
    path: '/account/delete',
  }),
  robots: { index: false, follow: false },
};

async function Content() {
  return (
    <MemberPage next="/account/delete" title={t.members.deleteTitle}>
      {() => <DeleteAccountForm />}
    </MemberPage>
  );
}

export default function DeleteAccountPage() {
  return (
    <Suspense fallback={<div className="container-site h-96 py-20" aria-busy="true" />}>
      <Content />
    </Suspense>
  );
}
