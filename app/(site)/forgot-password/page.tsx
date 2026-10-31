import { Suspense } from 'react';
import { AuthShell } from '@/components/members/auth-shell';
import { ForgotPasswordForm } from '@/components/members/member-forms';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({
    title: 'Reset your password',
    description: 'Get a link to reset your Smartmind password.',
    path: '/forgot-password',
  }),
  robots: { index: false, follow: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  return (
    <ForgotPasswordForm notice={error === 'expired' ? t.members.resetLinkFailed : undefined} />
  );
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell title={t.members.forgotTitle} lead={t.members.forgotLead}>
      <Suspense fallback={<div className="h-40" aria-busy="true" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
