import { TeamContacts } from '@/components/contact/contact-card';
import { ContactBeacon } from '@/components/home/contact-beacon';
import { PageHeader } from '@/components/ui/page-header';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Contact us',
  description:
    'Spark your idea, start a research collaboration or a project with the support of Smartmind. Email info@smartminduiai.com for general enquiries, or reach Amila, Samith or Sandaruwan directly.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to the team" />
      <div className="container-site pb-24">
        <ContactBeacon headingLevel="h2" />
        <TeamContacts />
      </div>
    </>
  );
}
