import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/members/auth-shell';
import { ResetPasswordForm } from '@/components/members/member-forms';
import { t } from '@/content/strings';
import { recentRecoveryUser } from '@/lib/members/recovery';
import { pageMeta } from '@/lib/seo';
import { createSessionClient } from '@/lib/supabase/server-client';

export const metadata = {
  ...pageMeta({
    title: 'Choose a new password',
    description: 'Choose a new Smartmind password.',
    path: '/reset-password',
  }),
  robots: { index: false, follow: true },
};

/** Only a session a reset link opened in the last 15 minutes gets the form; anyone else asks for a link. */
async function Form() {
  const supabase = await createSessionClient();
  if (!supabase) redirect('/forgot-password');
  if (!(await recentRecoveryUser(supabase))) redirect('/forgot-password?error=expired');
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title={t.members.resetTitle}>
      <Suspense fallback={<div className="h-40" aria-busy="true" />}>
        <Form />
      </Suspense>
    </AuthShell>
  );
}
