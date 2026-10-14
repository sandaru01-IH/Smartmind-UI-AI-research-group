# Smartmind website

The website of **Smartmind**, a GeoAI research network of Town & Country Planning alumni and students at the University of Moratuwa (Urban Simulation Lab). Public site, a small admin for publishing news, a Supabase database with Row Level Security, and tests.

- **Public site:** home with a live road-network simulation, research, chatbots, team, publications, awards, partners, news, collaborate, contact.
- **Admin:** sign in, publish quick updates and full articles, schedule posts, upload cover images.
- **Source of truth for facts:** `this.md`. All copy lives in `/content`, one module per section, each block commented with the section of `this.md` it came from.

Built with Next.js 16 (App Router, Cache Components), TypeScript (strict), Tailwind CSS 4, Supabase (Auth, Postgres, Storage), zod, Vitest and Playwright.

## Run it in ten minutes

You need Node 20 or newer and Docker (for the local Supabase).

```bash
npm install
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                       # http://localhost:3000
```

That is enough to see the public site. With no Supabase variables set it runs in **demo mode**: news comes from `content/seed-posts.ts` and `/admin` shows a setup screen.

### Turn on the admin (local Supabase)

```bash
npx supabase start                # prints the API URL and keys; first run downloads images
```

Put the printed values in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # server only, never exposed to the browser
```

Then:

```bash
npx supabase db reset             # applies supabase/migrations
npm run seed                      # loads the real milestones from this.md as news
npm run create-admin -- you@example.com   # prints a password once (or set ADMIN_PASSWORD, 12+ characters)
npm run dev
```

Sign in at <http://localhost:3000/admin>. There is no public sign-up anywhere: admins exist only because `npm run create-admin` made them.

## Scripts

| Command                         | What it does                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                   | Dev server.                                                                  |
| `npm run build` / `start`       | Production build and server.                                                 |
| `npm run lint`                  | ESLint.                                                                      |
| `npm run typecheck`             | TypeScript, strict.                                                          |
| `npm run format:check`          | Prettier.                                                                    |
| `npm test`                      | Vitest: unit tests, contrast checks, content checks, RLS and security tests. |
| `npm run e2e`                   | Builds, then runs the Playwright suite (needs local Supabase running).       |
| `npm run seed`                  | Upserts the seed posts (service role).                                       |
| `npm run create-admin -- EMAIL` | Creates or resets an admin (service role).                                   |
| `npm run screenshots`           | Screenshots of every route at 390, 768 and 1440 px, dark and light.          |

The RLS tests in `npm test` talk to the local Supabase and skip themselves when it is not running. They prove that anonymous visitors read only live posts and write nothing, that a signed-in non-admin cannot write, and that an admin can run the full lifecycle.

## How it fits together

```
app/                 routes: (site)/ public pages, admin/ (login + console), OG images, sitemap, robots
components/          ui primitives, layout, hero, home, research, chatbots, news, admin
content/             typed content layer, one module per section of this.md, plus seed posts and strings
lib/                 schemas (zod), slug, visibility rule, markdown sanitising, simulation engine, auth, posts data access
proxy.ts             gates /admin/*, and gives unknown /news/<slug> URLs a real 404
supabase/migrations  schema, Row Level Security, storage bucket
scripts/             seed, create-admin, screenshots
e2e/  tests/         Playwright specs, RLS and security tests
docs/                design-spec.md, plan.md, screenshots/
```

**Visibility rule** (one place in the app, one in the database): a visitor sees a post only if `status = 'published'` and `published_at <= now()`. Scheduled posts go live without a cron job. Admin changes call `updateTag` and `revalidatePath`, so public pages refresh within seconds. Posts with a future date appear within about 30 seconds of their time.

**Security**

- Three layers guard the admin: `proxy.ts`, a `requireAdmin()` call at the top of every admin page and server action, and Row Level Security in Postgres.
- The service-role key is read only by `scripts/`. A test fails if it appears in app code, in committed files, or in the client bundle.
- Markdown is sanitised with a strict schema (no raw HTML, no images, no scripts, safe link protocols).
- Uploads: JPEG, PNG or WebP, 5 MB. The browser checks first, the server issues a one-use signed upload URL, then the server reads the stored bytes back and checks the real file type. Bad files are deleted.
- Login errors are generic, failed attempts are throttled, redirect targets are limited to `/admin`.
- Security headers (CSP, `frame-ancestors 'none'`, nosniff, referrer policy, permissions policy, HSTS in production). Admin pages are `noindex` and `no-store`.

## Deploy to Vercel

1. Create a hosted Supabase project. Run `npx supabase link --project-ref <ref>` then `npx supabase db push`.
2. In Supabase: Authentication, turn **off** "Allow new users to sign up". Set the Site URL to your domain.
3. In Vercel, import the repository and set the environment variables from `.env.example` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_CONTACT_EMAIL`). Do **not** add the service-role key to Vercel; it is only for the scripts.
4. From your own machine, point `.env.local` at the hosted project and run `npm run seed` and `npm run create-admin -- you@example.com`.
5. Deploy.

## Editing content

- Facts and copy: edit the matching file in `content/`. Keep the source comment above each block.
- Mark a claim as unconfirmed with `confirmation: 'tbc'`. It shows a "To be confirmed" flag and stays off the home page and the numbers strip.
- Page text and labels: `content/strings.ts`. To add Sinhala or Tamil later, add a dictionary of the same shape and select it by locale in `getStrings`.
- Colours: `app/tokens.css` only. `npm test` checks WCAG contrast for every text and background pair in both themes.

See `CONTENT_TODO.md` for every placeholder and unconfirmed item, and what to supply.
