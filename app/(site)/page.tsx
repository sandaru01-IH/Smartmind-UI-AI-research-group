import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Hero } from '@/components/hero/hero';
import { CollaborateCta } from '@/components/home/collaborate-cta';
import { JourneyTeaser } from '@/components/home/journey-teaser';
import { LatestBento } from '@/components/home/latest-bento';
import { NumbersStrip } from '@/components/home/numbers-strip';
import { PartnersInline } from '@/components/home/partners-wall';
import { ResearchBento } from '@/components/research/research-bento';
import { ButtonLink } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { JsonLd } from '@/components/seo/json-ld';
import { BRAND, LINKS, SITE_URL, UNIVERSITY_CONTACT } from '@/content/brand';
import { PARTNERS } from '@/content/partners';
import { t } from '@/content/strings';

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name}, GeoAI for urban simulation | ${BRAND.lab}, ${BRAND.university}` },
  description: `${BRAND.name} is a GeoAI network of Town & Country Planning alumni and students at the ${BRAND.university}. Research on flood, land use, traffic and AI, and chatbots for planners and residents.`,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ResearchOrganization',
          name: BRAND.name,
          alternateName: `${BRAND.name}, ${BRAND.lab}`,
          url: SITE_URL,
          description: BRAND.pitch,
          parentOrganization: {
            '@type': 'CollegeOrUniversity',
            name: BRAND.university,
            address: {
              '@type': 'PostalAddress',
              streetAddress: UNIVERSITY_CONTACT.addressLines[0],
              addressLocality: 'Moratuwa',
              postalCode: '10400',
              addressCountry: 'LK',
            },
          },
          sameAs: [LINKS.facebook, LINKS.labPage],
          memberOf: { '@type': 'Organization', name: BRAND.lab },
        }}
      />
      <Hero />

      <Section id="latest" numeral="01" title={t.home.latest} lead={t.home.latestLead}>
        <Suspense fallback={<div className="h-96 border border-line bg-surface" aria-hidden="true" />}>
          <LatestBento />
        </Suspense>
      </Section>

      <Section id="numbers" numeral="02" title={t.home.numbers}>
        <NumbersStrip />
      </Section>

      <Section
        id="research"
        numeral="03"
        title={t.home.researchTitle}
        lead={t.home.researchLead}
        action={<ButtonLink href="/research" variant="secondary">{t.home.researchCta}</ButtonLink>}
      >
        <ResearchBento />
      </Section>

      <Section
        id="chatbots"
        numeral="04"
        title={t.home.chatbotsTitle}
        lead={t.home.chatbotsLead}
        action={<ButtonLink href="/chatbots" variant="secondary">{t.home.chatbotsCta}</ButtonLink>}
      >
        <JourneyTeaser />
      </Section>

      <Section
        id="partners"
        numeral="05"
        title={`${PARTNERS.length} ${t.home.partnersTitle.toLowerCase()}`}
        lead={t.home.partnersLead}
        action={<ButtonLink href="/partners" variant="secondary">{t.nav.partners}</ButtonLink>}
      >
        <PartnersInline />
      </Section>

      <section className="border-t border-line py-16 md:py-24">
        <div className="container-site">
          <CollaborateCta />
        </div>
      </section>
    </>
  );
}
