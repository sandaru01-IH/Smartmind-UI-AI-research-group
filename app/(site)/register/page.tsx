import Link from 'next/link';
import { AuthShell } from '@/components/members/auth-shell';
import { RegisterForm } from '@/components/members/member-forms';
import { t } from '@/content/strings';
import { pageMeta } from '@/lib/seo';

export const metadata = {
  ...pageMeta({
    title: 'Register',
    description: 'Create a Smartmind account to write, comment and like.',
    path: '/register',
  }),
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <AuthShell
      title={t.members.registerTitle}
      lead={t.members.registerLead}
      footer={
        <p>
          {t.members.haveAccount}{' '}
          <Link href="/login" className="text-fg underline underline-offset-4">
            {t.members.login}
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
