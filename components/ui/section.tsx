import type { ReactNode } from 'react';
import { Reveal } from './reveal';

/** Page section with an oversized mono numeral, a title and an optional lead. */
export function Section({
  id,
  numeral,
  title,
  lead,
  action,
  children,
  className = '',
}: {
  id?: string;
  numeral?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`border-t border-line py-16 md:py-24 ${className}`}>
      <div className="container-site">
        <Reveal className="grid-12 items-end gap-y-6">
          <div className="col-span-12 md:col-span-3">
            {numeral ? (
              <p aria-hidden="true" className="numeral text-4xl text-line-strong md:text-5xl">
                {numeral}
              </p>
            ) : null}
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 id={headingId} className="text-3xl md:text-4xl">
              {title}
            </h2>
            {lead ? <p className="mt-4 max-w-[60ch] text-lg text-muted">{lead}</p> : null}
          </div>
          {action ? <div className="col-span-12 md:col-start-4 md:col-span-9">{action}</div> : null}
        </Reveal>
        {children ? <div className="mt-10 md:mt-14">{children}</div> : null}
      </div>
    </section>
  );
}
