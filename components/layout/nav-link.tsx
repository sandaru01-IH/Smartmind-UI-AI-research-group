'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function ActiveLink({ href, className, activeMark, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={className}>
      {children}
      {active ? activeMark : null}
    </Link>
  );
}

interface NavLinkProps {
  href: string;
  className?: string;
  /** Rendered inside the link only while it is the current page. */
  activeMark?: ReactNode;
  children: ReactNode;
}

/**
 * Link that marks itself as the current page. The pathname is read inside a Suspense boundary so the
 * header can sit in the static shell of routes whose URL is only known at request time.
 */
export function NavLink(props: NavLinkProps) {
  return (
    <Suspense
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <ActiveLink {...props} />
    </Suspense>
  );
}

function Watcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

/** Calls `onChange` whenever the route changes. Used to close the mobile menu. */
export function RouteChange({ onChange }: { onChange: () => void }) {
  return (
    <Suspense fallback={null}>
      <Watcher onChange={onChange} />
    </Suspense>
  );
}
