import { AuthShell } from '@/components/members/auth-shell';
import { ResetPasswordForm } from '@/components/members/member-forms';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({
    title: 'Choose a new password',
    description: 'Choose a new Smartmind password.',
    path: '/reset-password',
  }),
  robots: { index: false, follow: true },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title={t.members.resetTitle}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
