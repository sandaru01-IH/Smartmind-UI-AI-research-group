import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { t } from '@/content/strings';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sharp font-sans text-[0.95rem] font-semibold leading-none transition-[background-color,transform,opacity] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50';

type Size = 'md' | 'sm' | 'icon';

const sizes: Record<Size, string> = {
  md: 'px-5 py-2.5',
  sm: 'px-3 py-2.5',
  icon: 'h-11 w-11 shrink-0 p-0',
};

const variants: Record<Variant, string> = {
  primary: 'bg-signal text-signal-fg hover:brightness-95',
  secondary: 'border border-line-strong text-fg hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'border border-danger text-danger hover:bg-surface-2',
};

export function buttonClass(variant: Variant = 'primary', extra = '', size: Size = 'md'): string {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`.trim();
}

type LinkProps = {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>;

export function ButtonLink({ href, variant = 'primary', className, children, ...rest }: LinkProps) {
  const external = /^https?:\/\//.test(href);
  if (external) {
    return (
      <a
        href={href}
        className={buttonClass(variant, className)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
        <ArrowUpRight size={16} aria-hidden="true" />
        <span className="sr-only">({t.common.external})</span>
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: { variant?: Variant } & ComponentProps<'button'>) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}
