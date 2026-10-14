import { ContactCard } from '@/components/contact/contact-card';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { BRAND } from '@/content/brand';
import { COLLABORATE } from '@/content/contact';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Collaborate',
  description:
    'Build a tailored chatbot with Smartmind, or join the network of Town & Country Planning alumni and students.',
  path: '/collaborate',
});

export default function CollaboratePage() {
  return (
    <>
      <PageHeader
        eyebrow="Collaborate"
        title={COLLABORATE.heading}
        lead={BRAND.callToAction + '.'}
      />

      <Section id="chatbots" numeral="01" title="Tailored chatbots">
        <div className="max-w-[60ch] space-y-5 text-lg">
          {COLLABORATE.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Section>

      <Section id="join" numeral="02" title="Join the network">
        <p className="max-w-[60ch] text-lg">{COLLABORATE.membership}</p>
      </Section>

      <Section id="contact" numeral="03" title="Get in touch">
        <ContactCard />
      </Section>
    </>
  );
}
