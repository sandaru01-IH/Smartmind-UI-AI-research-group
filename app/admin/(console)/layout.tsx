import { Suspense, type ReactNode } from 'react';
import { AdminFrame } from '@/components/admin/admin-frame';
import { SetupScreen } from '@/components/admin/setup-screen';
import { requireAdmin } from '@/lib/auth/require-admin';
import { hasSupabase } from '@/lib/supabase/env';

async function Gate({ children }: { children: ReactNode }) {
  if (!hasSupabase()) return <SetupScreen />;
  const { user } = await requireAdmin();
  return <AdminFrame email={user.email}>{children}</AdminFrame>;
}

/** Everything under (console) needs an admin. The proxy gates first; this checks the role itself. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
