import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { AdminFrame } from '@/components/admin/admin-frame';
import { AdminSkeleton } from '@/components/admin/admin-skeleton';
import { SetupScreen } from '@/components/admin/setup-screen';
import { requireAdmin } from '@/lib/auth/require-admin';
import { hasSupabase } from '@/lib/supabase/env';

/** The admin depends on the signed-in user, so it opts out of instant-navigation validation. */
export const instant = false;

/** Checks the session before anything behind it renders. The result is shared with the page. */
async function Gate({ children }: { children: ReactNode }) {
  // Everything behind the admin gate depends on the signed-in user, so it renders per request.
  await connection();
  if (!hasSupabase()) return <SetupScreen />;
  await requireAdmin();
  return children;
}

async function Account() {
  await connection();
  if (!hasSupabase()) return 'Demo mode';
  const { user } = await requireAdmin();
  return (
    <>
      Signed in as <span className="text-fg">{user.email}</span>
    </>
  );
}

/**
 * Everything under (console) needs an admin. The proxy gates first; this checks the role itself.
 * The frame is outside the Suspense boundaries, so it is on screen before the session check ends.
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <AdminFrame
      account={
        <Suspense fallback={<span className="skeleton inline-block h-3 w-48 align-middle" />}>
          <Account />
        </Suspense>
      }
    >
      <Suspense fallback={<AdminSkeleton />}>
        <Gate>{children}</Gate>
      </Suspense>
    </AdminFrame>
  );
}
