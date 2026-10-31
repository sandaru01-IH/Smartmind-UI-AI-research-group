import type { ReactNode } from 'react';

/**
 * Top of an inner page: mono eyebrow, large display title, lead. A long statement as the title
 * (`compact`) is set smaller and wider so it reads as a few lines, not a wall of display type.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  compact = false,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="container-site pb-12 pt-14 md:pb-20 md:pt-24">
      <p className="label-mono text-muted">{eyebrow}</p>
      <h1
        className={
          compact
            ? 'mt-4 max-w-[30ch] text-3xl md:text-5xl lg:text-6xl'
            : 'mt-4 max-w-[18ch] text-4xl md:text-[length:var(--text-display)]'
        }
      >
        {title}
      </h1>
      {lead ? <p className="mt-6 max-w-[58ch] text-lg text-muted md:text-xl">{lead}</p> : null}
      {children}
    </header>
  );
}
