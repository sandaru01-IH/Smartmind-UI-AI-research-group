import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Hero } from '@/components/hero/hero';
import { ContactBeacon } from '@/components/home/contact-beacon';
import { JourneyTeaser } from '@/components/home/journey-teaser';
import { LatestSection } from '@/components/home/latest-bento';
import { LatestMedium } from '@/components/home/latest-medium';
import { LatestVideo } from '@/components/home/latest-video';
import { NumbersStrip } from '@/components/home/numbers-strip';
import { PhilosophyTriangle } from '@/components/home/philosophy-triangle';
import { ResearchBento } from '@/components/research/research-bento';
import { ButtonLink } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { JsonLd } from '@/components/seo/json-ld';
import { BRAND, LINKS, SITE_URL, UNIVERSITY_CONTACT } from '@/content/brand';
import { t } from '@/content/strings';
import { getMilestones, getNumberStats, getResearch } from '@/lib/catalog/public';
import { numberWordCap } from '@/lib/number-words';
import { getTeamNetwork } from '@/lib/team/public';

export const metadata: Metadata = {
  title: {
    absolute: `${BRAND.name}, GeoAI for urban simulation | ${BRAND.lab}, ${BRAND.university}`,
  },
  description: `${BRAND.name} is a GeoAI network of Town & Country Planning alumni and students at the ${BRAND.university}. Research on urban science, disaster management, transport and mobility systems, and AI.`,
  alternates: { canonical: '/' },
};

async function Numbers() {
  const { members } = await getTeamNetwork();
  return <NumbersStrip stats={await getNumberStats(members.length)} />;
}

async function Journey() {
  return <JourneyTeaser milestones={await getMilestones()} />;
}

async function ResearchThemes() {
  const { themes } = await getResearch();
  return <ResearchBento themes={themes} />;
}

async function ResearchHeading() {
  const { themes } = await getResearch();
  return (
    <>{`${numberWordCap(themes.length)} research ${themes.length === 1 ? 'theme' : 'themes'}`}</>
  );
}

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
          logo: `${SITE_URL}/brand/icon-512.png`,
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
          sameAs: [LINKS.facebook, LINKS.youtube, LINKS.labPage],
          memberOf: { '@type': 'Organization', name: BRAND.lab },
        }}
      />
      <Hero />

      <Section
        id="philosophy"
        numeral="01"
        title={t.home.philosophyTitle}
        lead={t.home.philosophyLead}
        action={
          <ButtonLink href="/about" variant="secondary">
            About Smartmind
          </ButtonLink>
        }
      >
        <PhilosophyTriangle />
      </Section>

      {/* Appears only once the admin has published news; renders nothing before that. */}
      <Suspense fallback={null}>
        <LatestSection />
      </Suspense>

      {/* Optional sections the admin can switch off. Each renders nothing when it has nothing to show. */}
      <Suspense fallback={null}>
        <LatestVideo />
      </Suspense>
      <Suspense fallback={null}>
        <LatestMedium />
      </Suspense>

      <Section id="numbers" numeral="02" title={t.home.numbers}>
        <Suspense
          fallback={<div className="h-44 border border-line bg-surface" aria-hidden="true" />}
        >
          <Numbers />
        </Suspense>
      </Section>

      <Section
        id="research"
        numeral="03"
        title={
          <Suspense fallback={t.home.researchTitle}>
            <ResearchHeading />
          </Suspense>
        }
        lead={t.home.researchLead}
        action={
          <ButtonLink href="/research" variant="secondary">
            {t.home.researchCta}
          </ButtonLink>
        }
      >
        <Suspense
          fallback={<div className="h-96 border border-line bg-surface" aria-hidden="true" />}
        >
          <ResearchThemes />
        </Suspense>
      </Section>

      <Section
        id="journey"
        numeral="04"
        title={t.home.journeyTitle}
        lead={t.home.journeyLead}
        action={
          <ButtonLink href="/research#journey" variant="secondary">
            {t.home.journeyCta}
          </ButtonLink>
        }
      >
        <Suspense
          fallback={<div className="h-64 border border-line bg-surface" aria-hidden="true" />}
        >
          <Journey />
        </Suspense>
      </Section>

      <section id="contact" className="border-t border-line py-16 md:py-24">
        <div className="container-site">
          <ContactBeacon />
        </div>
      </section>
    </>
  );
}
