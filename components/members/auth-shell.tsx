import type { ReactNode } from 'react';
import { t } from '@/content/strings';
import { hasSupabase } from '@/lib/supabase/env';

/** The narrow page frame shared by register, log in and password reset. */
export function AuthShell({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container-site py-14 md:py-24">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {lead ? <p className="mt-3 text-lg text-muted">{lead}</p> : null}
        <div className="mt-8">
          {hasSupabase() ? children : <p className="text-muted">{t.members.disabled}</p>}
        </div>
        {footer ? <div className="mt-8 text-muted">{footer}</div> : null}
      </div>
    </div>
  );
}
