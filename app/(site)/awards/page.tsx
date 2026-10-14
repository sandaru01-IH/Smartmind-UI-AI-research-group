import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { TbcFlag } from '@/components/ui/tag';
import { AWARDS_NEWEST_FIRST, CONFIRMED_AWARD_COUNT } from '@/content/awards';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Awards',
  description: `Awards won by the people of the Urban Simulation Lab, newest first. ${CONFIRMED_AWARD_COUNT} from 2018 and 2019 are confirmed.`,
  path: '/awards',
});

export default function AwardsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Awards"
        title="Recognised by peers"
        lead={`Nine awards are on record, from 2018 to 2025. The ${CONFIRMED_AWARD_COUNT} from 2018 and 2019 come from the department’s research page. The 2024 and 2025 entries are awaiting confirmation.`}
      />
      <div className="container-site pb-24">
        <ol className="border-t border-line">
          {AWARDS_NEWEST_FIRST.map((a, i) => (
            <Reveal
              as="li"
              key={a.id}
              index={i % 4}
              className="grid-12 gap-y-3 border-b border-line py-8"
            >
              <div className="col-span-12 md:col-span-3">
                <p className="numeral text-5xl md:text-6xl">{a.year}</p>
                <p className="label-mono mt-2 text-muted">{a.when}</p>
              </div>
              <div className="col-span-12 md:col-span-9">
                <h2 className="text-2xl md:text-3xl">{a.award}</h2>
                <p className="mt-3 text-lg">{a.who}</p>
                <p className="mt-1 text-muted">{a.event}</p>
                {a.reason ? <p className="mt-1 text-muted">{a.reason}</p> : null}
                {a.confirmation === 'tbc' ? <TbcFlag className="mt-4" /> : null}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </>
  );
}
