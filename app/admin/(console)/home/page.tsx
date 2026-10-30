import { connection } from 'next/server';
import Link from 'next/link';
import { HomeSectionsForm } from '@/components/admin/home-sections-form';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminHomeSections } from '@/lib/home/admin';

/** Per-user admin page: it renders on request and shows loading.tsx while it does. */
export const instant = false;

export default async function AdminHomePage() {
  await connection();
  const { supabase } = await requireAdmin();
  const sections = await adminHomeSections(supabase);
  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center text-[0.95rem] text-muted hover:text-fg"
        >
          ← Dashboard
        </Link>
        <h1 className="text-3xl">Home page sections</h1>
        <p className="mt-2 max-w-[62ch] text-muted">
          Choose which extra sections appear below the news on the home page. A section with nothing
          to show is left out, whatever its switch says.
        </p>
      </header>
      <HomeSectionsForm initial={sections} />
    </div>
  );
}
