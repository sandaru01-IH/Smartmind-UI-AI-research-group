# SmartMind website: design spec

Status: draft for approval. Source of truth for all facts: `this.md`.

## 1. Audience and goals

| Audience                                       | What they need                                        | Where we serve them                      |
| ---------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Planners and agencies (NBRO, UDA, councils)    | Proof the work is real; a way to commission a chatbot | Home, Chatbots, Collaborate              |
| Researchers and funders                        | Publications, themes, partners, awards                | Research, Publications, Awards, Partners |
| Alumni and students of Town & Country Planning | Who is in the network; how to join                    | About, Team, Collaborate                 |
| Press and the public                           | What happened recently                                | Latest ticker, News                      |

Primary goal: make SmartMind legible as a serious GeoAI research studio and give visitors one clear next step (collaborate). Secondary: let admins publish news without code.

Non-goals: e-commerce, public accounts, comments, a blog platform, multilingual launch.
Anti-goals: looking like a university template or SaaS landing page; any invented fact; motion that harms.

## 2. Aesthetic direction: "Urban Signal"

Dark-first editorial/technical look. A live road-network simulation is the hero. Hairline borders, oversized mono numerals, one sharp accent (lime). Theme colours appear only as data codes.

Rejected alternatives

1. **"Paper atlas"**: warm cartographic, serif-led, light-first. Beautiful but reads as a museum or a journal; it undersells the live, computational nature of the work and makes the hero simulation feel bolted on.
2. **"Dashboard brutalism"**: dense grid of panels, monospace everywhere, neon on black. Reads as an ops console; hurts scanning for non-technical visitors (agencies, alumni) and fails on mobile.

## 3. Information architecture

```
/                 Home
/about
/research
/chatbots
/team
/publications     search + year/venue filters
/awards
/partners
/news             category, tags, featured, load more
/news/[slug]
/collaborate      (and /contact: same content family)
/contact
/admin/login
/admin            dashboard + Quick Update
/admin/posts/new
/admin/posts/[id]
404, error
```

Global: skip link, nav, Latest ticker under nav, command palette (Ctrl/Cmd+K), footer (university address, phone, Facebook, lab note, same-name disclaimer).

Home order: hero simulation, pitch, Latest bento, numbers strip, research teaser, chatbot journey teaser, partners wall, collaborate CTA.

Confirmed-only rule: items flagged unconfirmed in this.md (2024 and 2025 awards, 4ONSE, PLoS ONE paper, LinkedIn-snippet items) are excluded from the home page and from counters. On their own pages they appear with a visible "To be confirmed" flag where this.md allows listing at all; seed news about them is a draft. See `CONTENT_TODO.md`.

## 4. Design tokens

Single source: CSS variables in `app/tokens.css`, mapped into Tailwind theme. No hard-coded hex in components.

Dark (default)

| Token         | Value   | Use                                            |
| ------------- | ------- | ---------------------------------------------- |
| `--ink`       | #090D12 | page background                                |
| `--graphite`  | #121922 | raised surfaces                                |
| `--line`      | #1F2A36 | hairlines                                      |
| `--mist`      | #8FA3B5 | secondary text (verify AA on ink and graphite) |
| `--paper`     | #F2EFE8 | primary text                                   |
| `--signal`    | #C6FF3D | buttons, live dot, focus                       |
| `--flood`     | #2DE2C6 | theme: flood                                   |
| `--landslide` | #FFB347 | theme: landslide / hazard                      |
| `--traffic`   | #FF6B57 | theme: traffic                                 |

Light (warm): background paper #F2EFE8, text ink, hairlines a darkened paper, secondary text a darkened mist. Lime is used only as a filled button background with ink text, or as a decorative mark, never as text on paper. Theme colours get darker text-safe variants for light mode (`--flood-ink` etc.).

Contrast: a script (`scripts/check-contrast.ts`, unit-tested) computes WCAG ratios for every declared text/background pair in both themes and fails the build below 4.5:1 (3:1 for large text and UI borders). The values above are a starting point; exact secondary and light-mode shades are fixed by that script, not by eye.

Type (next/font, self-hosted, `display: swap` with size-adjusted fallbacks to avoid CLS)

- Display: Bricolage Grotesque. Body: Instrument Sans. Data/labels/dates/tags: JetBrains Mono.
- Fluid scale with `clamp()`: step -1 to 7, base 1rem at 360 px rising to about 1.125rem at 1440 px; display up to about 8rem.

Space and layout: 12-column grid, 4 px base unit, gutters 16 / 24 / 32 px at 360 / 768 / 1280+, max content width 1360 px, hairline 1 px borders, radius 2 px (sharp, technical). Breakpoints: 360, 640, 768, 1024, 1280, 1536.

## 5. Motion principles

- Duration 150 to 400 ms, one easing family (`cubic-bezier(0.22, 1, 0.36, 1)` out, one in-out variant).
- Reveals stagger by 40 ms, trigger once on enter.
- Parallax only on the chatbot timeline year numerals and the hero legend; capped to 24 px.
- Page transitions via the View Transitions API where supported, otherwise none.
- Infinite loops: only the ticker dot and the hero simulation. Ticker scrolling is user-pausable and respects reduced motion (becomes a static, manually stepped list).
- `prefers-reduced-motion`: no parallax, no counters (final values shown), no flow animation in the diagram, hero replaced by a static SVG of the same network.

### Hero simulation (technical notes)

- Procedural graph from a seeded RNG (stable across loads): 150 to 250 nodes by relaxed Poisson-disc sampling, edges from a Delaunay-like neighbour pruning, removing long edges.
- Betweenness approximated by sampled shortest paths (about 40 sources), cached once, sizes the nodes.
- Agents follow shortest paths using Dijkstra on the current edge weights; a cursor or touch "flood" disc multiplies weights of edges inside radius, agents re-plan when their next edge becomes blocked.
- Agent cap by device: 450 desktop, 200 mid, 90 low-end (from `hardwareConcurrency`, `deviceMemory`, viewport). Adaptive: if frame time exceeds 20 ms for 30 frames, reduce agents by 25%.
- Canvas 2D, devicePixelRatio capped at 2, `IntersectionObserver` and `visibilitychange` pause. Hero text is HTML and is the LCP element; canvas mounts after first paint via `requestIdleCallback`.
- Legend in mono: "agents rerouting around flooded roads".

## 6. Data model

```
profiles(id uuid pk -> auth.users, role text check in ('admin'), created_at)
posts(id uuid pk default gen_random_uuid(),
      type text check in ('article','update'),
      title text, slug text unique, excerpt text, body_md text,
      category text check in (News, Event, Research, Chatbot, Award, Publication, Partnership),
      tags text[], cover_path text, cover_alt text, link_url text,
      event_date date, featured boolean default false,
      status text check in ('draft','published') default 'draft',
      published_at timestamptz, author_id uuid -> profiles,
      created_at, updated_at)
indexes: status, published_at, slug
```

Constraints added beyond the brief: update headline <= 140 chars; cover_alt required when cover_path is set; published posts require published_at; link_url must be http(s).

Visibility (single rule, one tested function and one RLS policy): `status = 'published' AND published_at <= now()`.

Storage: bucket `media`, public read, admin-only write, 5 MB, JPEG/PNG/WebP. Server action re-validates MIME by sniffing magic bytes, not only the declared type. Responsive sizes are served via next/image with the Supabase loader (no stored derivatives needed); the original is kept.

Content layer (`/content`, typed, one module per section): about, team, chatbots, research, partners, publications, awards, contact, plus `seed-posts.ts` and a `strings` module so Sinhala/Tamil can be added later by locale-keyed dictionaries. Every block has a comment naming its `this.md` section.

Demo mode: with Supabase env missing, public routes read `seed-posts.ts` through the same repository interface; `/admin` renders a setup screen.

## 7. Security model

- Auth: Supabase email and password, no public sign-up (sign-ups disabled in project settings; no UI). `@supabase/ssr` cookie sessions, httpOnly, secure, SameSite=Lax.
- Authorisation, three layers: (1) middleware gates `/admin/*`; (2) every server action and route handler calls `requireAdmin()` which checks the session user and `profiles.role = 'admin'`; (3) RLS enforces the same in Postgres. Never trust hidden UI.
- RLS on `profiles`, `posts`, `storage.objects`. Anon: select published and live posts only. Admin: full write on posts and `media` objects. Non-admin authenticated users: no write. Profiles: a user may read only their own row; no client write.
- Admin creation only via `npm run create-admin -- you@example.com` using `SUPABASE_SERVICE_ROLE_KEY` (server-side env, read only by the script; never `NEXT_PUBLIC_`, never imported in `app/`; a test greps the client bundle output for the key name and value pattern).
- Login: generic error text for all failures, no enumeration; client-side lockout feedback plus server-side throttle (per IP + email, in-memory/Upstash-optional) with `Retry-After`.
- Input: zod schemas shared by client and server, server is authoritative. Slug: lowercase ASCII, hyphens, unique, reserved words rejected.
- Output: react-markdown with rehype-sanitize (strict schema, no raw HTML, links forced `rel="noopener noreferrer"`), React escaping elsewhere, JSON-LD serialised with `<` escaped.
- Headers: CSP (nonce-based, `frame-ancestors 'none'`, `img-src` limited to self, Supabase host, data/blob), `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`, HSTS in production.
- Admin: `noindex`, `robots` disallow, `Cache-Control: no-store`.
- Secrets: `.env.example` only; `.gitignore` covers `.env*`.

Tests prove: anonymous cannot read drafts or future-dated posts and cannot write; a signed-in non-admin cannot write; an admin completes create, publish, edit, unpublish, delete. These run against a local Supabase (Docker) in CI-style runs, and policy logic is also unit-tested.

## 8. Caching and freshness

Public pages are server-rendered with tagged fetches (`posts`, `post:{slug}`, `latest`). Every admin mutation calls `revalidateTag` and `revalidatePath` for `/`, `/news`, `/news/[slug]`, and the sitemap. Scheduled posts become visible without a cron because queries filter on `published_at <= now()`; pages that show them use a short revalidate window (60 s) so a scheduled time passes into view within a minute.

## 9. SEO and quality bars

Title pattern "Page | SmartMind, Urban Simulation Lab, University of Moratuwa". Canonical URLs, Open Graph and Twitter images generated with `next/og`, sitemap.xml, robots.txt, JSON-LD (`ResearchOrganization` on home, `NewsArticle` on posts). Targets: Lighthouse mobile 90+ on four key pages, LCP < 2.5 s, CLS < 0.1, axe clean on key pages, WCAG 2.2 AA.

## 10. Testing and verification

Vitest: zod schemas, slug generation, visibility rule, access-control helpers, contrast checker, graph generation and rerouting logic. Playwright: public routes without console errors in both themes at 390/768/1440, axe, admin lifecycle, failed login, anonymous redirect. Screenshots land in `docs/screenshots/`.

## 11. Open decisions (defaults assumed unless you say otherwise)

See the questions sent with this spec.
