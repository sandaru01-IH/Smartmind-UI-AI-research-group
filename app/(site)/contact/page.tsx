import { ContactCard } from '@/components/contact/contact-card';
import { ContactBeacon } from '@/components/home/contact-beacon';
import { PageHeader } from '@/components/ui/page-header';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Contact us',
  description:
    'Spark your idea, start a research collaboration or a project with the support of Smartmind. Email info@smartminduiai.com.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to the team" />
      <div className="container-site space-y-5 pb-24">
        <ContactBeacon headingLevel="h2" />
        <ContactCard />
      </div>
    </>
  );
}
