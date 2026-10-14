import Link from 'next/link';
import { Wordmark } from '@/components/brand/logo';
import { ExternalLink } from '@/components/ui/external-link';
import { BRAND, LINKS, NOT_RELATED, UNIVERSITY_CONTACT } from '@/content/brand';
import { t } from '@/content/strings';
import { NAV_ITEMS, CTA_ITEM } from './nav-items';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-site grid-12 gap-y-10 py-14 md:py-20">
        <div className="col-span-12 md:col-span-5">
          <Wordmark />
          <p className="mt-5 max-w-[42ch] text-muted">{t.footer.partOf}</p>
          <p className="label-mono mt-5 text-muted">{BRAND.tagline}</p>
        </div>

        <nav aria-label={t.nav.footer} className="col-span-6 md:col-span-3">
          <p className="label-mono text-muted">{t.nav.primary}</p>
          <ul className="mt-4 space-y-1">
            {[...NAV_ITEMS, CTA_ITEM].map((item) => (
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
          <p className="label-mono text-muted">{t.footer.contact}</p>
          <address className="mt-4 not-italic">
            {UNIVERSITY_CONTACT.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="mt-3 block">
              {UNIVERSITY_CONTACT.phones.map((phone, i) => (
                <span key={phone}>
                  {i > 0 ? ' / ' : ''}
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="inline-block py-2 hover:underline"
                  >
                    {phone}
                  </a>
                </span>
              ))}
            </span>
          </address>
          <p className="mt-4">
            <ExternalLink
              href={LINKS.facebook}
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              {t.footer.follow}
            </ExternalLink>
          </p>
        </div>

        <div className="col-span-12 border-t border-line pt-8 text-sm text-muted">
          <p className="max-w-[80ch]">
            {t.footer.notRelated}{' '}
            {NOT_RELATED.map((o, i) => (
              <span key={o.name}>
                {o.name} ({o.description}){i < NOT_RELATED.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </p>
          <p className="label-mono mt-6">{t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
