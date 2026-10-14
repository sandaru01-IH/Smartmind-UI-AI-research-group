import type { ComponentProps } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { t } from '@/content/strings';

/** An outbound link. Opens in a new tab, says so to screen readers, never leaks the opener. */
export function ExternalLink({ children, className, ...rest }: ComponentProps<'a'>) {
  return (
    <a
      {...rest}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={14} aria-hidden="true" className="ml-0.5 inline-block align-[-0.1em]" />
      <span className="sr-only"> ({t.common.external})</span>
    </a>
  );
}
