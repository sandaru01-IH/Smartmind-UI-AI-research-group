import Link from 'next/link';
import { Database } from 'lucide-react';

const STEPS = [
  { title: 'Start Supabase locally', code: 'npx supabase start' },
  {
    title: 'Copy the API URL and anon key into .env.local',
    code: 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\nNEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from the start output>',
  },
  {
    title: 'Add the server-only key the scripts use (see .env.example)',
    code: '# the secret key printed by supabase start. It stays on the server and is never exposed to the browser.',
  },
  { title: 'Apply the schema and seed the news', code: 'npx supabase db reset\nnpm run seed' },
  { title: 'Create the first admin', code: 'npm run create-admin -- you@example.com' },
  { title: 'Restart the dev server, then sign in', code: 'npm run dev' },
];

/** Shown in place of the admin when Supabase is not configured (demo mode). */
export function SetupScreen() {
  return (
    <main id="main" className="mx-auto min-h-dvh max-w-2xl px-[var(--gutter)] py-16">
      <p className="label-mono flex items-center gap-2 text-muted">
        <Database size={14} aria-hidden="true" /> Demo mode
      </p>
      <h1 className="mt-4 text-4xl">Connect Supabase to use the admin</h1>
      <p className="mt-4 text-muted">
        The public site is running on its built-in seed posts. The admin needs a Supabase project
        for sign-in, the post database and image storage. Follow these steps once.
      </p>
      <ol className="mt-10 space-y-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-line pt-4">
            <p className="flex gap-3">
              <span className="numeral text-muted">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-semibold">{s.title}</span>
            </p>
            <pre className="mt-2 overflow-x-auto border border-line bg-surface p-3 font-mono text-sm">
              {s.code}
            </pre>
          </li>
        ))}
      </ol>
      <p className="mt-10">
        <Link href="/" className="underline underline-offset-4">
          Back to the site
        </Link>
      </p>
    </main>
  );
}
