import { LegalPage } from '@/components/members/legal-page';
import { TERMS } from '@/content/legal';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Terms of use',
  description: 'The rules for writing, commenting and liking on the Smartmind community blog.',
  path: '/terms',
});

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
