import type { ReactNode } from 'react';
import { t } from '@/content/strings';
import type { ThemeId } from '@/content/types';

const inkByTheme: Record<ThemeId, string> = {
  land: 'text-landslide-ink',
  flood: 'text-flood-ink',
  traffic: 'text-traffic-ink',
  ai: 'text-ai-ink',
};

/** Mono label. Pass `theme` to colour-code it with a research theme. */
export function Tag({
  children,
  theme,
  className = '',
}: {
  children: ReactNode;
  theme?: ThemeId;
  className?: string;
}) {
  return (
    <span
      className={`label-mono inline-flex items-center rounded-sharp border border-line-strong px-2 py-1 leading-none ${
        theme ? inkByTheme[theme] : 'text-muted'
      } ${className}`}
    >
      {children}
    </span>
  );
}

/** Small flag for claims this.md marks as unconfirmed. */
export function TbcFlag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`label-mono inline-flex items-center gap-1.5 rounded-sharp border border-dashed border-landslide-ink px-2 py-1 leading-none text-landslide-ink ${className}`}
    >
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-landslide-ink" />
      {t.common.toBeConfirmed}
    </span>
  );
}
