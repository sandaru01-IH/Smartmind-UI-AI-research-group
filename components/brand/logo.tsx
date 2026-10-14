import { BRAND } from '@/content/brand';

/**
 * PLACEHOLDER mark (see CONTENT_TODO.md). An "S" road network built from connected nodes,
 * with a signal hub where the routes meet. Replace with the supplied logo when ready.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M18 4 L7 6 L8.5 12 L15.5 12 L17 18 L6 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="4" r="1.9" fill="currentColor" />
      <circle cx="7" cy="6" r="1.4" fill="currentColor" />
      <circle cx="17" cy="18" r="1.4" fill="currentColor" />
      <circle cx="6" cy="20" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="2.6" fill="var(--signal)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight">{BRAND.name}</span>
    </span>
  );
}
