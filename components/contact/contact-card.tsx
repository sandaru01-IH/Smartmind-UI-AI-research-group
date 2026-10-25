import { CONTACT_EMAIL } from '@/content/brand';
import { TEAM_CONTACTS, formatLkPhone, telHref } from '@/content/philosophy';

/**
 * The people behind the network. The shared inbox is for general enquiries; anything that needs
 * detail or a conversation goes to one of the members directly.
 */
export function TeamContacts() {
  return (
    <section aria-labelledby="contact-members" className="pt-12 md:pt-16">
      <h2 id="contact-members" className="sr-only">
        Contact the members
      </h2>
      <p className="max-w-[62ch] text-lg text-muted">
        For general enquiries write to{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-fg underline underline-offset-4">
          {CONTACT_EMAIL}
        </a>
        . For details and discussions, reach any of the members below.
      </p>
      <ul className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        {TEAM_CONTACTS.map((c) => (
          <li key={c.name} className="bg-surface p-6">
            <p className="font-display text-xl">{c.name}</p>
            <a
              href={telHref(c.phone)}
              className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {formatLkPhone(c.phone)}
            </a>
            {c.email ? (
              <a
                href={`mailto:${c.email}`}
                className="block min-h-11 py-2 underline underline-offset-4"
              >
                {c.email}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
