'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ExternalLink, FileText, Home, Loader2, MessagesSquare, Plus, Users } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

/** Spinner that shows while the link it sits in is loading its page. */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 size={14} aria-hidden="true" className="animate-spin" /> : null;
}

function NavLink({
  href,
  active,
  variant = 'ghost',
  children,
}: {
  href: string;
  active?: boolean;
  variant?: 'ghost' | 'primary';
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${buttonClass(variant, '', 'sm')} ${active ? 'bg-surface-2' : ''}`}
    >
      {children}
      <Pending />
    </Link>
  );
}

/** The admin bar links. They show where you are, and a spinner the moment you click one. */
export function AdminNav() {
  const path = usePathname();
  return (
    <>
      <NavLink href="/admin/posts/new" variant="primary">
        <Plus size={16} aria-hidden="true" />
        <span className="hidden sm:inline">New post</span>
        <span className="sm:hidden">New</span>
      </NavLink>
      <NavLink href="/admin/content" active={path.startsWith('/admin/content')}>
        <FileText size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Content</span>
        <span className="sr-only sm:hidden">Content</span>
      </NavLink>
      <NavLink href="/admin/home" active={path.startsWith('/admin/home')}>
        <Home size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Home page</span>
        <span className="sr-only sm:hidden">Home page</span>
      </NavLink>
      <NavLink href="/admin/community" active={path.startsWith('/admin/community')}>
        <MessagesSquare size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Community</span>
        <span className="sr-only sm:hidden">Community</span>
      </NavLink>
      <NavLink href="/admin/team" active={path.startsWith('/admin/team')}>
        <Users size={16} aria-hidden="true" />
        <span className="hidden sm:inline">Team</span>
        <span className="sr-only sm:hidden">Team</span>
      </NavLink>
      <Link
        href="/"
        target="_blank"
        className={buttonClass('ghost', '', 'sm')}
        aria-label="View the public site (opens in a new tab)"
      >
        <ExternalLink size={16} aria-hidden="true" />
        <span className="hidden sm:inline">View site</span>
      </Link>
    </>
  );
}
