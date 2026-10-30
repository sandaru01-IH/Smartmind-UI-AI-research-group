import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/members/auth-shell';
import { MemberLoginForm } from '@/components/members/member-forms';
import { t } from '@/content/strings';
import { safeMemberNext } from '@/lib/members/schema';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({
    title: 'Log in',
    description: 'Log in to your Smartmind account.',
    path: '/login',
  }),
  robots: { index: false, follow: true },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const notice =
    one(sp.verified) === '1'
      ? t.members.verifiedNotice
      : one(sp.error) === 'confirm'
        ? t.members.confirmFailed
        : undefined;
  return <MemberLoginForm next={safeMemberNext(one(sp.next))} notice={notice} />;
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthShell
      title={t.members.loginTitle}
      lead={t.members.loginLead}
      footer={
        <p>
          {t.members.noAccount}{' '}
          <Link href="/register" className="text-fg underline underline-offset-4">
            {t.members.register}
          </Link>
        </p>
      }
    >
      <Suspense fallback={<div className="h-64" aria-busy="true" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
