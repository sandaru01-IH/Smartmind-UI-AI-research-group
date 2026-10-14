import type { ReactNode } from 'react';
import { SiteShell } from '@/components/layout/site-shell';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
