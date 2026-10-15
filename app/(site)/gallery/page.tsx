import { Suspense } from 'react';
import { MomentCard } from '@/components/gallery/moment-card';
import { PartnerLogos } from '@/components/gallery/partner-logos';
import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { ALSO_NAMED, PARTNERS } from '@/content/partners';
import { getGalleryPosts } from '@/lib/posts/public';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Gallery & Partners',
  description: `Moments from the Smartmind team, and the ${PARTNERS.length} national and international research partners of the Urban Simulation Lab.`,
  path: '/gallery',
});

async function Moments() {
  const posts = await getGalleryPosts();
  if (posts.length === 0) {
    return (
      <p className="border border-dashed border-line-strong p-6 text-muted">
        Moments from conferences, field work and events will appear here.
      </p>
    );
  }
  const [first, ...rest] = posts;
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <Reveal className="md:col-span-2">
        <MomentCard post={first} feature priority />
      </Reveal>
      {rest.map((p, i) => (
        <Reveal key={p.id} index={(i % 3) + 1}>
          <MomentCard post={p} />
        </Reveal>
      ))}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <>
      <PageHeader eyebrow="Gallery & Partners" title="Moments and partners" />

      <Section id="gallery" numeral="01" title="Gallery">
        <Suspense
          fallback={<div className="h-96 border border-line bg-surface" aria-hidden="true" />}
        >
          <Moments />
        </Suspense>
      </Section>

      <Section id="partners" numeral="02" title="Partners">
        <PartnerLogos partners={PARTNERS} />
        <p className="mt-12 max-w-[70ch] text-[0.95rem] text-muted">
          Also named in project news: {ALSO_NAMED.map((p) => p.name).join(', ')}.
        </p>
      </Section>
    </>
  );
}
