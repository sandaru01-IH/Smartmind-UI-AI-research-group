import { ExternalLink } from '@/components/ui/external-link';
import { LINKS, UNIVERSITY_CONTACT } from '@/content/brand';

/** Where the lab sits: the University of Moratuwa's postal address and phones, plus the Facebook page. */
export function ContactCard() {
  return (
    <section
      aria-labelledby="contact-university"
      className="grid gap-8 border border-line bg-surface p-6 md:grid-cols-2 md:p-10"
    >
      <div>
        <h2 id="contact-university" className="text-2xl">
          University of Moratuwa
        </h2>
        <address className="mt-5 not-italic">
          {UNIVERSITY_CONTACT.addressLines.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </address>
        <p className="label-mono mt-4 text-muted">
          General university contact, not a Smartmind address.
        </p>
      </div>
      <ul className="space-y-1">
        {UNIVERSITY_CONTACT.phones.map((p) => (
          <li key={p}>
            <a
              href={`tel:${p.replace(/\s/g, '')}`}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {p}
            </a>
          </li>
        ))}
        <li>
          <a
            href={`mailto:${UNIVERSITY_CONTACT.email}`}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {UNIVERSITY_CONTACT.email}
          </a>
        </li>
        <li>
          <ExternalLink
            href={LINKS.facebook}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Facebook page
          </ExternalLink>
        </li>
      </ul>
    </section>
  );
}
