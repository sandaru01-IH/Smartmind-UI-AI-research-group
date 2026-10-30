import Link from 'next/link';
import { Wordmark } from '@/components/brand/logo';
import { ExternalLink } from '@/components/ui/external-link';
import { BRAND, CONTACT_EMAIL, LINKS } from '@/content/brand';
import { TEAM_CONTACTS, formatLkPhone, telHref } from '@/content/philosophy';
import { t } from '@/content/strings';
import { FLAT_NAV_ITEMS, CTA_ITEM } from './nav-items';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-site grid-12 gap-y-10 py-14 md:py-20">
        <div className="col-span-12 md:col-span-5">
          <Wordmark size={68} />
          <p className="mt-5 max-w-[42ch] text-muted">{t.footer.partOf}</p>
          <p className="label-mono mt-5 text-muted">{BRAND.tagline}</p>
        </div>

        <nav aria-label={t.nav.footer} className="col-span-6 md:col-span-3">
          <p className="label-mono text-muted">{t.nav.primary}</p>
          <ul className="mt-4 space-y-1">
            {[...FLAT_NAV_ITEMS, CTA_ITEM].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center hover:underline md:min-h-9"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="col-span-12 md:col-span-4">
          <p className="label-mono text-muted">{t.footer.smartmindContact}</p>
          <p className="mt-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="label-mono mt-6 text-muted">{t.footer.contact}</p>
          <ul className="mt-4 space-y-4">
            {TEAM_CONTACTS.map((c) => (
              <li key={c.name}>
                <p>{c.name}</p>
                <a
                  href={telHref(c.phone)}
                  className="inline-flex min-h-11 items-center hover:underline md:min-h-9"
                >
                  {formatLkPhone(c.phone)}
                </a>
                {c.email ? (
                  <a
                    href={`mailto:${c.email}`}
                    className="block break-all py-1.5 text-muted underline underline-offset-4 hover:text-fg"
                  >
                    {c.email}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex flex-wrap gap-x-6">
            <ExternalLink
              href={LINKS.facebook}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {t.footer.follow}
            </ExternalLink>
            <ExternalLink
              href={LINKS.youtube}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {t.footer.youtube}
            </ExternalLink>
          </p>
        </div>

        <div className="col-span-12 border-t border-line pt-8 text-sm text-muted">
          <p className="label-mono">{t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
