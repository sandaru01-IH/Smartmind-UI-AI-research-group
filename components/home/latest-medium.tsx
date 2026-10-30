import { MediumCard } from '@/components/medium/medium-card';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { t } from '@/content/strings';
import { getMediumArticles } from '@/lib/catalog/public';
import { getHomeSections } from '@/lib/home/sections';

/** The newest Medium articles. Renders nothing when the admin switched it off or there are none. */
export async function LatestMedium() {
  const [sections, articles] = await Promise.all([getHomeSections(), getMediumArticles(3)]);
  if (!sections.medium || articles.length === 0) return null;
  return (
    <Section
      id="latest-medium"
      title={t.home.latestMedium}
      lead={t.home.latestMediumLead}
      action={
        <ButtonLink href="/medium" variant="secondary">
          {t.home.allMedium}
        </ButtonLink>
      }
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a, i) => (
          <li key={a.id}>
            <Reveal index={i}>
              <MediumCard article={a} />
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
