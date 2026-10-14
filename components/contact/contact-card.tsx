import { Mail } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { CONTACT_EMAIL, LINKS, UNIVERSITY_CONTACT } from '@/content/brand';
import { COLLABORATE } from '@/content/contact';

/**
 * Contact details. The Smartmind email is not yet known, so the email action renders only when
 * NEXT_PUBLIC_CONTACT_EMAIL is set. Until then a clear "coming soon" state is shown.
 */
export function ContactCard() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section
        aria-labelledby="contact-smartmind"
        className="border border-line bg-surface p-6 md:p-8"
      >
        <h2 id="contact-smartmind" className="text-2xl">
          Smartmind
        </h2>
        {CONTACT_EMAIL ? (
          <p className="mt-5">
            <ButtonLink href={`mailto:${CONTACT_EMAIL}`}>
              <Mail size={16} aria-hidden="true" />
              Email the team
            </ButtonLink>
          </p>
        ) : (
          <p
            className="mt-5 border border-dashed border-line-strong p-4 text-muted"
            data-testid="contact-soon"
          >
            {COLLABORATE.emailPending}
          </p>
        )}
        <p className="mt-5">
          <ExternalLink
            href={LINKS.facebook}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Facebook page
          </ExternalLink>
        </p>
      </section>

      <section
        aria-labelledby="contact-university"
        className="border border-line bg-surface p-6 md:p-8"
      >
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
        <ul className="mt-4 space-y-1">
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
        </ul>
        <p className="label-mono mt-4 text-muted">
          General university contact, not a Smartmind address.
        </p>
      </section>
    </div>
  );
}
