import { PartnersWall } from '@/components/home/partners-wall';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { ALSO_NAMED, PARTNERS } from '@/content/partners';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Partners',
  description: `${PARTNERS.length} national and international research partners of the Urban Simulation Lab.`,
  path: '/partners',
});

export default function PartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="Research partners"
        lead="The Urban Simulation Lab lists national and international partners. Logos need each partner’s permission, so names are shown as text for now."
      />
      <div className="container-site pb-16">
        <PartnersWall showNote />
      </div>
      <Section
        id="also"
        numeral="+"
        title="Also named in project news"
        lead="Not on the lab’s partner list, but named in the department’s research page or in news about specific projects."
      >
        <ul className="border-t border-line">
          {ALSO_NAMED.map((p) => (
            <li key={p.name} className="grid-12 gap-y-1 border-b border-line py-4">
              <span className="col-span-12 font-display text-xl md:col-span-5 md:text-2xl">
                {p.name}
              </span>
              <span className="col-span-12 text-muted md:col-span-7">{p.context}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
