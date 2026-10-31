import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { confirmLinkAction } from '@/app/members-actions';
import { AuthShell } from '@/components/members/auth-shell';
import { buttonClass } from '@/components/ui/button';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({
    title: 'Confirm your email',
    description: 'Finish confirming your Smartmind email address.',
    path: '/auth/confirm',
  }),
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Where the emailed links land. Opening the link only shows this page; the one-use token is spent
 * when the button is pressed (see confirmLinkAction), so a mail scanner that opens the link first
 * cannot use it up.
 */
async function Step({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const tokenHash = one(sp.token_hash);
  const type = one(sp.type);
  const code = one(sp.code);
  if (!tokenHash && !code) redirect('/login?error=confirm');
  const reset = type === 'recovery' || Boolean(code);

  return (
    <AuthShell
      title={reset ? t.members.forgotTitle : t.members.confirmTitle}
      lead={reset ? t.members.confirmResetLead : t.members.confirmLead}
    >
      <form action={confirmLinkAction}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="code" value={code} />
        <button type="submit" className={buttonClass('primary', 'w-full')}>
          {reset ? t.members.confirmResetButton : t.members.confirmButton}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className="container-site h-64 py-24" aria-busy="true" />}>
      <Step searchParams={searchParams} />
    </Suspense>
  );
}
