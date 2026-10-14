# SmartMind website: Claude Code build prompt

## Before you paste (3 steps)

1. Make an empty project folder. Download the content brief from its doc as Markdown, rename it `this.md`, and put it in that folder.
2. In Claude Code, run these one at a time:
   ```
   /plugin marketplace add obra/superpowers-marketplace
   /plugin install superpowers@superpowers-marketplace
   /plugin install frontend-design@claude-plugins-official
   ```
3. Optional but recommended: create a free Supabase project and keep its Project URL, anon key and service-role key ready. The prompt works without it (read-only demo mode), but the admin login needs it.

Open Claude Code inside the folder and paste everything below the line.

---

<role>
You are a senior product designer and full-stack engineer building the official website for SmartMind, a GeoAI research network of Town & Country Planning alumni and students at the University of Moratuwa (Urban Simulation Lab). The site must look and feel like a world-class research studio, not a university template and not a generic SaaS landing page.
</role>

<source_of_truth>
- `this.md` in the project root is the single content root. Read it completely before doing anything else.
- Every factual claim on the site (names, dates, numbers, partners, titles, awards, links) must come from `this.md`. Never invent facts, quotes, statistics, testimonials, team roles, emails, logos or photos.
- Put all site copy in a typed content layer under `/content` (one module per section: about, team, chatbots, research, partners, publications, awards, contact). Above each block, add a comment naming the section of `this.md` it came from.
- Anything `this.md` says is missing (logo, brand colours, team roles and photos, a SmartMind email, chatbot demo links, languages) must NOT be faked. Use the placeholder policy below and list each item in `CONTENT_TODO.md`.
- Where `this.md` marks a claim as unconfirmed (the 2024 and 2025 awards, the 4ONSE project, the PLoS ONE paper, items seen only as search snippets), show it with a small "to be confirmed" flag in the admin and in `CONTENT_TODO.md`, and keep it off the public home page.
- Use British spelling. Tone: confident, plain, short sentences. No buzzword filler, no "Welcome to our website", no lorem ipsum.
</source_of_truth>

<workflow>
Use the Superpowers workflow and the frontend-design skill. Work in these phases and do not skip the gates.

0. Environment check. Confirm the superpowers and frontend-design plugins are available. If either is missing, stop and tell me the exact install commands from the setup list instead of improvising around them.
1. Brainstorm and design spec. Read `this.md`, then write `docs/design-spec.md` covering: audience and goals, the chosen aesthetic direction (with two alternatives you rejected and why), information architecture, design tokens, motion principles, the data model, and the security model. Ask me at most five questions in ONE message, each with your recommended default (Supabase project available? brand name spelling? logo? languages? hosting?). Wait for my approval of the spec once, then continue without further interruptions unless something is truly blocking.
2. Plan. Write `docs/plan.md` as small tasks (about an hour each) with exact file paths, acceptance checks and test commands.
3. Implement task by task. Commit after each task with a clear message. Use test-driven development for logic (validation schemas, slug generation, publish and visibility rules, access control). Build the design system first (tokens, type, primitives), then pages, then the admin.
4. Verify before claiming done. Run lint, type-check, unit tests, the production build, and the Playwright end-to-end suite. Open the running site, take screenshots at 390, 768 and 1440 px in dark and light themes, and critique them against the design spec. Fix what falls short, then repeat.
5. Report. Summarise what was built, how to run it, what is still placeholder, and what I must supply. Keep the report short.
</workflow>

<tech_stack>
- Next.js (current stable, App Router), TypeScript in strict mode, Tailwind CSS with design tokens defined as CSS variables, Motion (the `motion` / framer-motion library) for animation, `next/font` for fonts, `next/image` for images.
- Supabase for Auth, Postgres with Row Level Security, and Storage, using `@supabase/ssr` for cookie sessions.
- Validation with zod. Markdown rendering with `react-markdown` plus `rehype-sanitize`. Icons: Lucide (never emoji as icons).
- Tests: Vitest for unit tests, Playwright for end-to-end, `@axe-core/playwright` for accessibility.
- Demo mode: if the Supabase environment variables are missing, the public site must still run, reading seed posts from `/content/seed-posts.ts`, and `/admin` must show a clear setup screen with the steps to connect Supabase instead of crashing.
- Default hosting target: Vercel. Include `.env.example` and a README with exact setup steps. Never commit secrets.
</tech_stack>

<design_direction>
Concept: "Urban Signal". The site should feel like looking into a living city simulation, because that is the work: road-network centrality, population and flood modelling, GeoAI. The design must be distinctive, editorial and technical, not decorated.

Look and feel
- Dark theme by default with a warm light theme available. Respect the system preference, and provide a toggle that persists.
- Palette (starting point; refine it with the frontend-design skill, but keep it bold and avoid purple-to-blue gradients):
  - ink `#090D12`, graphite `#121922`, line `#1F2A36`, mist `#8FA3B5`, paper `#F2EFE8`
  - primary signal: lime `#C6FF3D` (buttons, live indicators, focus)
  - theme codes, used only to colour-code research themes and categories: flood teal `#2DE2C6`, landslide amber `#FFB347`, traffic coral `#FF6B57`
  - verify WCAG AA contrast for every text and background pair in both themes; in light mode never put lime text on paper.
- Typography: Bricolage Grotesque for display (tight, large, confident), Instrument Sans for body, JetBrains Mono for data labels, dates, coordinates and tags. Do not use Inter, Roboto, Arial or system fonts. Use fluid type with `clamp()`.
- Layout: asymmetric editorial grids, a 12-column system, generous whitespace, thin hairline borders, oversized section numerals (01, 02, 03), and a bento grid for research themes. Avoid the generic three-equal-cards row, centred hero with two buttons, floating blobs, glassmorphism stacks and stock illustration.
- Original brand mark (placeholder): a small SVG logo built from a few connected nodes forming an "S" road network, plus the wordmark "SmartMind". Mark it as a placeholder in `CONTENT_TODO.md`.

Signature moments (build all of these)
1. Hero simulation: a full-viewport canvas drawing a procedurally generated road network (about 150 to 250 nodes). Small agents flow along the roads. Node size reflects approximate betweenness centrality, echoing the lab's network-centrality research. Moving the cursor or finger raises a "flood" ripple that blocks nearby edges so agents visibly reroute. Include a tiny legend in mono type ("agents rerouting around flooded roads"). It must run smoothly (target 60 fps on a mid-range phone, pause when off-screen, cap agent count by device), respect `prefers-reduced-motion` with a static SVG fallback, and never block LCP.
2. Live "Latest" ticker: a slim bar under the nav showing the newest short updates from the admin, with a pulsing lime "LIVE" dot. Pauses on hover and focus, and is fully keyboard and screen-reader accessible.
3. Chatbot journey timeline: the dated milestones from `this.md` (EXMO 2023 to Street Cloud, September 2026) as a scroll-driven vertical timeline with a sticky progress rail and the year in oversized mono type. Native scrolling only, no scroll-jacking.
4. Chatbot architecture diagram: an SVG built only from facts in `this.md` (language agent, live-weather API agent, scheduler agent, WhatsApp channel, planner and resident outputs), animating data flow on view.
5. Research bento: four themes (Land use and population, Flood, Traffic and transport, AI and machine learning), each with its theme colour, a hover-reveal of its projects from `this.md`, and a small generative pattern unique to the theme.
6. Command palette: `Cmd/Ctrl + K` opens a search over pages, news, publications and team, with keyboard navigation.
7. Numbers strip: animated counters using ONLY figures that appear in `this.md` (for example 12 listed papers, 8 core team members, 4 research themes, and 7 awards from 2018 and 2019 that `this.md` sources to the department page; leave out figures flagged as unconfirmed, such as the 27 weather stations of 4ONSE, until confirmed). Each counter shows a source note on hover.
8. Partners: a typographic wall of partner names (no logos until permission exists), grouped national and international.

Motion rules: durations 150 to 400 ms, one easing family, staggered reveals on enter, subtle parallax only where it adds meaning, page transitions via the View Transitions API where supported. Nothing should loop forever except the ticker dot and the hero simulation. Everything must degrade gracefully with reduced motion.

Responsive: design mobile-first from 360 px to 1920 px, 44 px minimum touch targets, a full-screen mobile menu, no horizontal scroll at any width.

Anti-patterns to avoid: auto-rotating carousels, lorem ipsum, emoji icons, unexplained stats, cookie-cutter feature grids, walls of text, hidden contrast failures, motion that makes people ill.
</design_direction>

<public_pages>
Build these routes, using the site map and copy in `this.md`:
- `/` Home: hero simulation, one-sentence pitch (paraphrase the "systems of systems" idea from `this.md`), the Latest bento (one featured news card plus the most recent items), the numbers strip, a research teaser, the chatbot journey teaser, the partners wall, and a collaborate call to action.
- `/about` What SmartMind is, its home in the Urban Simulation Lab, the alumni and student network, and the lab tagline.
- `/research` The four themes and ongoing projects, plus the 4ONSE weather station (flagged as to be confirmed).
- `/chatbots` The full journey, the architecture diagram, the philosophy of institution-specific chatbots, and an invitation to collaborate.
- `/team` The eight core members and named collaborators. Use initials avatars (no invented photos) and show roles only where `this.md` states them.
- `/publications` Searchable and filterable by year and venue, with working links from `this.md`.
- `/awards` Timeline of awards, newest first.
- `/partners` National and international partners.
- `/news` and `/news/[slug]` The dynamic news area (see the admin section): filters by category, tags, a featured post, and pagination or "load more".
- `/collaborate` and `/contact` The invitation to build tailored chatbots plus the university contact details from `this.md`. The SmartMind email is missing, so render the contact action only when `NEXT_PUBLIC_CONTACT_EMAIL` is set, otherwise show a clear "contact details coming soon" state. Do not invent an address.
- Footer: university address and phone from `this.md`, the Facebook link from `this.md`, a note that SmartMind is part of the Urban Simulation Lab at the University of Moratuwa, and a note distinguishing it from unrelated organisations of the same name.
- Custom 404 and error pages that match the design.
</public_pages>

<admin_cms>
Goal: an admin signs in and publishes news cards and quick "latest" updates without touching code, and edits them later.

Content types (one `posts` table):
- Article: a full news card with cover image, title, excerpt, body, category, tags, optional external link, optional event date, optional "featured/pinned".
- Update: a short "something just happened" item (headline up to 140 characters, optional link and image) that feeds the live ticker and the Latest strip.
Categories: News, Event, Research, Chatbot, Award, Publication, Partnership.

Routes and features
- `/admin/login`: email and password, designed as carefully as the public site (full-bleed simulation backdrop, one focused form). Generic error messages (no user enumeration), loading and lockout feedback, "show password" toggle, and no public sign-up anywhere.
- `/admin` dashboard: stats (published, drafts, last update time), a prominent Quick Update composer (headline, optional link, optional image, one click to publish), a post table with search, status and category filters, sort, and row actions (edit, duplicate, publish or unpublish, delete with confirmation).
- `/admin/posts/new` and `/admin/posts/[id]`: a form with title, auto-generated editable slug (unique, validated), category, tags, excerpt, cover image upload with required alt text, a Markdown body editor with toolbar and live preview, optional external link, optional event date, featured toggle, status (draft or published), and an optional scheduled publish date. Autosave drafts, unsaved-changes warning, a "preview as visitor" action, and toast feedback. Keyboard accessible.
- Image uploads: JPEG, PNG or WebP only, maximum 5 MB, validated on the client and the server, stored in a Supabase Storage bucket, with generated responsive sizes. Reject everything else.
- Sign-out, session expiry handling, and a visible "signed in as" indicator.
- Admin pages are `noindex`, use a calmer variant of the same design system, and work well on a phone.

Visibility rules
- Visitors see a post only if `status = 'published'` AND `published_at <= now()`. Scheduled posts therefore go live without a cron job.
- Publishing, editing, unpublishing and deleting must refresh the affected public pages (on-demand revalidation by tag and path) so changes appear within seconds.
</admin_cms>

<data_model_and_security>
Deliver a SQL migration in `supabase/migrations/` and a seed script.

- `profiles(id uuid primary key references auth.users, role text check (role in ('admin')), created_at)`
- `posts(id uuid primary key, type text check (type in ('article','update')), title text, slug text unique, excerpt text, body_md text, category text, tags text[], cover_path text, cover_alt text, link_url text, event_date date, featured boolean default false, status text check (status in ('draft','published')) default 'draft', published_at timestamptz, author_id uuid references profiles, created_at, updated_at)` with indexes on `status, published_at` and on `slug`.
- Row Level Security on everything. Public (anon) may only `select` published posts whose `published_at <= now()`. Only a signed-in user whose profile has `role = 'admin'` may insert, update or delete posts and objects in the media bucket. The media bucket is publicly readable and admin-writable.
- Admin accounts are created only by a local script, `npm run create-admin -- you@example.com`, which uses the service-role key. That key must never reach the browser, the repository or client bundles.
- Defence in depth: middleware protects `/admin/*`, AND every server action and route handler calls a `requireAdmin()` check on the server. Never rely on hidden UI or middleware alone.
- Sanitise rendered Markdown, validate all input with zod on the server, escape output, set sensible security headers (CSP, frame-ancestors, referrer policy, no-sniff), and use httpOnly secure cookies.
- Write tests that prove: an anonymous user cannot read drafts or write anything; a non-admin user cannot write; an admin can do the full lifecycle.
</data_model_and_security>

<seed_and_placeholder_policy>
- Seed the news area with real milestones taken from `this.md` (for example the 29 December 2023 NBRO and Manchester meeting, the May 2025 ICSD-2025 award, the May 2026 participatory chatbot paper, the September 2026 Street Cloud presentation). Mark anything unconfirmed as a draft rather than publishing it. Never seed invented news.
- Placeholders: logo mark and wordmark are original and flagged; team members get initials avatars; partner names are text only; cover images are generated SVG or canvas artwork in the site's visual language. Do not copy images from other websites (for example the chatbot article's screenshots). Leave documented slots (with aspect ratios) for real photos and logos.
</seed_and_placeholder_policy>

<quality_bars>
- Accessibility: WCAG 2.2 AA, keyboard-only usable, visible focus states, skip link, semantic landmarks, alt text, reduced-motion support, no axe violations on key pages.
- Performance: Lighthouse mobile 90 or higher for Performance, Accessibility, Best Practices and SEO on the home page, `/news`, a news article and `/research`; LCP under 2.5 s; CLS under 0.1; no layout shift from fonts or images.
- SEO: unique titles and descriptions (title pattern "Page | SmartMind, Urban Simulation Lab, University of Moratuwa" so it is not confused with other organisations named SmartMind), canonical URLs, Open Graph and Twitter cards with generated images, `sitemap.xml`, `robots.txt`, and JSON-LD (`Organization`/`ResearchOrganization` on the home page, `NewsArticle` on posts).
- Code quality: strict TypeScript, no `any`, small components, one source of truth for tokens, ESLint and Prettier clean, and a README that lets a new developer run the project in under ten minutes.
- Structure the content layer so adding Sinhala and Tamil later is straightforward (no hard-coded strings in components), but ship English only unless I say otherwise.
</quality_bars>

<deliverables>
- A working Next.js project in this folder: public site, admin, migration, seed script, `create-admin` script, tests, `.env.example`, `README.md`.
- `docs/design-spec.md`, `docs/plan.md`, `CONTENT_TODO.md` (every placeholder and unconfirmed claim, each with what I must supply), and `docs/screenshots/` with the final screenshots at 390, 768 and 1440 px in both themes.
</deliverables>

<definition_of_done>
Do not say the work is finished until all of these are true, and show the evidence (command output or screenshots) for each:
1. `npm run lint`, type-check, unit tests, `npm run build` and the Playwright suite all pass.
2. The end-to-end suite proves: failed login shows a generic error; `/admin` redirects anonymous visitors to the login page; an admin can sign in, create a draft (not visible publicly), publish it (visible on `/news`, the home Latest strip and the ticker within seconds), edit it, unpublish it, and delete it.
3. All public routes render without console errors in dark and light themes at 390, 768 and 1440 px, and match the design spec.
4. Every number, name, date and link on the public site can be traced to `this.md`, and `CONTENT_TODO.md` lists every placeholder.
5. The hero simulation respects reduced motion, runs smoothly, and does not delay the largest contentful paint.
6. No secrets are committed, and the service-role key appears nowhere in client code.
</definition_of_done>
