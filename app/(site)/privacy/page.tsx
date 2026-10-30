import { LegalPage } from '@/components/members/legal-page';
import { PRIVACY } from '@/content/legal';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Privacy notice',
  description: 'What the Smartmind community blog keeps about people who register.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
