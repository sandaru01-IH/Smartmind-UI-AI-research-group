import { ContactCard } from '@/components/contact/contact-card';
import { PageHeader } from '@/components/ui/page-header';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Contact',
  description: 'How to reach Smartmind and the University of Moratuwa.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to the team"
        lead="Questions about the research, the chatbots or joining the network."
      />
      <div className="container-site pb-24">
        <ContactCard />
      </div>
    </>
  );
}
