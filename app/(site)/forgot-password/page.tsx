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

export default function ForgotPasswordPage() {
  return (
    <AuthShell title={t.members.forgotTitle} lead={t.members.forgotLead}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
