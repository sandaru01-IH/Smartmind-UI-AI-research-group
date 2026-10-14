import { PageHeader } from '@/components/ui/page-header';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { TbcFlag } from '@/components/ui/tag';
import { TEAM, initials, type Person } from '@/content/team';
import { pageMeta } from '@/lib/seo';

export const metadata = pageMeta({
  title: 'Team',
  description:
    'The eight core members of Smartmind, the authors of its chatbot papers and its named collaborators.',
  path: '/team',
});

function PersonCard({ person, index }: { person: Person; index: number }) {
  return (
    <Reveal as="li" index={index} className="flex gap-5 border border-line bg-surface p-5">
      {/* Initials avatar. Replace with a photo once members give consent (see CONTENT_TODO.md). */}
      <div
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center border border-line-strong font-mono text-xl text-fg"
      >
        {initials(person.name)}
      </div>
      <div className="min-w-0">
        <h3 className="text-xl">{person.name}</h3>
        {person.affiliation ? (
          <p className="label-mono mt-1 text-muted">{person.affiliation}</p>
        ) : null}
        <ul className="mt-3 space-y-1 text-[0.95rem] text-muted">
          {person.appears.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        {person.confirmation === 'tbc' ? <TbcFlag className="mt-3" /> : null}
      </div>
    </Reveal>
  );
}

export default function TeamPage() {
  const group = (g: Person['group']) => TEAM.filter((p) => p.group === g);
  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="The people behind Smartmind"
        lead="Eight people are named as the core team in a January 2024 article by Amila Jayasinghe. Roles are not yet published, so each entry shows where the person appears."
      />

      <Section id="core" numeral="01" title="Core team">
        <ul className="grid gap-4 md:grid-cols-2">
          {group('core').map((p, i) => (
            <PersonCard key={p.slug} person={p} index={i} />
          ))}
        </ul>
      </Section>

      <Section id="authors" numeral="02" title="Authors and project team">
        <ul className="grid gap-4 md:grid-cols-2">
          {group('authors').map((p, i) => (
            <PersonCard key={p.slug} person={p} index={i} />
          ))}
        </ul>
      </Section>

      <Section
        id="collaborators"
        numeral="03"
        title="Collaborators"
        lead="Named on the 2026 participatory chatbot paper."
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {group('collaborator').map((p, i) => (
            <PersonCard key={p.slug} person={p} index={i} />
          ))}
        </ul>
      </Section>
    </>
  );
}
