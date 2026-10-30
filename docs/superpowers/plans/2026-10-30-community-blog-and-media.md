# Community Blog, Medium Articles, YouTube Feed and Home Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dropdown "Stories" menu, a self-service community blog with comments and likes, admin-managed Medium articles, an automatic YouTube feed and switchable home-page sections, plus the new home headline.

**Architecture:** Community content lives in new Supabase tables, separate from the team's `posts` (News). Ordinary accounts get a `member_profiles` row and never an admin `profiles` row. Admin moderation can only flip `hidden` / `blocked` flags through `SECURITY DEFINER` functions, never edit text. Public reads follow the existing cached `'use cache'` + tag pattern in `lib/posts/public.ts`. Medium articles reuse the existing "content kind" system (mirror `collaborations`).

**Tech Stack:** Next.js 16 (cacheComponents, `proxy.ts`), React 19, Supabase (auth, Postgres RLS, storage), Tailwind, zod, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-community-blog-and-media-design.md`

## Global Constraints

- `AGENTS.md`: this Next.js differs from training data. Before touching caching (`'use cache'`, `cacheTag`, `updateTag`), `proxy.ts`, server actions or metadata, read the matching guide in `node_modules/next/dist/docs/`.
- English only, strings in `content/strings.ts` (British spelling). No hard-coded visible text in components.
- Home headline exact text: `Understanding Complex Cities and Designing Adaptive, Dynamic Systems & applications for Sustainable Cities and Livable Communities — with Super Intelligence + Great Love.`
- Top bar gains exactly **one** item, label **"Stories"**, with dropdown entries **Blog** (`/blog`), **Medium articles** (`/medium`), **Videos** (`/videos`), **News** (`/news`). News leaves the top bar. `/news` URLs keep working.
- YouTube channel id `UCN7fW6O_yGOuJrma_B4ywlA`; feed `https://www.youtube.com/feeds/videos.xml?channel_id=UCN7fW6O_yGOuJrma_B4ywlA`; embeds use `youtube-nocookie.com`; cache about an hour.
- No ordinary account may ever reach `/admin`, `public.is_admin()`, or admin data. The admin can only hide/show posts and comments and block/unblock accounts; no admin edit of text.
- Posts publish immediately (no approval step). Hidden items vanish from every public page, list, sitemap, search index and OG image.
- Demo mode (no Supabase env, `hasSupabase()` false) must still build and run; community features show a disabled notice.
- The service-role key must never appear in `app/`, `components/`, `lib/`, `content/` or `proxy.ts` (`tests/security/no-service-key.test.ts`). Account deletion therefore uses a `SECURITY DEFINER` SQL function, not the admin API.
- Database changes: new files in `supabase/migrations/` (timestamps after `20261023000000`), and the same SQL appended to `hosted-clean-install.sql` (it is the migrations concatenated).
- Defaults chosen by the designer: at most 10 posts and 30 comments per member per hour (database-enforced); post body max 50,000 characters, comment max 2,000.
- Commits: the owner chose no new branch, so commit on the current branch (`master`). `git add` only the files named in the task. The working tree already holds unrelated uncommitted changes (`package.json`, notes files, `scripts/copy-local-to-hosted.ts`): never `git add -A`. The owner has allowed commits.
- Every task ends with `npm run typecheck`, `npm run lint` and `npm test` green. Tasks touching RLS also run against local Supabase (`npm run db:start`, `.env.local` filled).

## Review Focus

1. A hidden post, comment or blocked author's content must be absent everywhere: list, direct URL (real 404 status), search index, sitemap, OG image, home section, author page. (Tasks 9, 11, 12.)
2. A blocked, unverified or signed-out user must be refused at the database even with a still-valid session or a hand-made request. (Task 6.)
3. Hostile post bodies (script tags, `javascript:` links, images from other sites, raw HTML) render inert. (Task 8.)
4. Sinhala/Tamil/emoji-only titles must produce valid unique slugs (the existing `slugify` returns `post` for these). (Task 8.)
5. YouTube feed down, empty, malformed or carrying HTML entities in titles: the Videos page and home section hide or fall back, never error. (Task 4.)

---

### Task 1: Headline, branch and hygiene

**Files:**
- Modify: `content/philosophy.ts` (`line`), `.gitignore`
- Test: `content/philosophy.test.ts` (create)

**Interfaces:** Produces: nothing new; `PHILOSOPHY.line` (existing export, confirm its name in the file) holds the new text.

- [ ] **Step 1:** Add `.superpowers/` to `.gitignore`. (No new branch: the owner chose to commit on `master`.)
- [ ] **Step 2: Write failing test** `content/philosophy.test.ts`: the philosophy `line` equals the exact headline in Global Constraints; the other headlines (`Intelligence + Love`, `Open · Reproducible · Simple`, `The Highest Intelligence, the Deepest Love`) are unchanged.
- [ ] **Step 3:** Run `npx vitest run content/philosophy.test.ts` → FAIL.
- [ ] **Step 4:** Change `line` in `content/philosophy.ts`. Find every place `line` renders (`components/hero/hero.tsx`, about page, footer, `components/contact/contact-card.tsx`, metadata/OG) and fix any overflow or truncation for the much longer text at 390px and 1440px widths (use `npm run screenshots` or the dev server).
- [ ] **Step 5:** Run the test → PASS; run `npm run typecheck && npm run lint`.
- [ ] **Step 6:** Commit `content/philosophy.ts content/philosophy.test.ts .gitignore docs/superpowers` — "Home headline: new line; ignore brainstorm scratch".

### Task 2: "Stories" dropdown navigation

**Files:**
- Modify: `components/layout/nav-items.ts`, `components/layout/site-header.tsx`, `components/layout/site-footer.tsx`, `components/palette/command-palette.tsx` (only if it lists nav items), `app/sitemap.ts`, `content/strings.ts`
- Create: `components/layout/nav-dropdown.tsx`, `app/(site)/blog/page.tsx`, `app/(site)/medium/page.tsx`, `app/(site)/videos/page.tsx` (stub pages: heading + "Nothing here yet." until Tasks 3, 4, 9 fill them)
- Test: `components/layout/nav-items.test.ts` (create), `e2e/public.spec.ts` (extend)

**Interfaces:**
- Produces: `NAV_ITEMS: NavEntry[]` where `type NavEntry = NavItem | NavGroup` and `interface NavGroup { label: string; children: NavItem[] }`; `STORIES_GROUP: NavGroup`; `PAGE_INDEX: NavItem[]` (flat, includes the four children so search/palette/sitemap keep working); `isNavGroup(e: NavEntry): e is NavGroup`.

- [ ] **Step 1: Write failing test** `nav-items.test.ts`: `NAV_ITEMS` has 8 entries (the 8 current ones, minus News, plus Stories; `/news` absent at top level); the Stories group's children hrefs are exactly `['/blog','/medium','/videos','/news']`; `PAGE_INDEX` contains `/news` and `/blog`; no duplicate hrefs in `PAGE_INDEX`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the types and data in `nav-items.ts`; add strings (`nav.stories`, `nav.blog`, `nav.medium`, `nav.videos`).
- [ ] **Step 4:** Implement `NavDropdown({ group }: { group: NavGroup })` in `nav-dropdown.tsx`: a disclosure button (`aria-expanded`, `aria-controls`), opens on click/tap and on hover or focus-within on desktop, closes on Escape, outside click and route change, arrow keys move between entries, focus returns to the button on Escape. Highlights as current when the path is any child's path. Render it in `site-header.tsx` desktop nav; in the mobile menu render the group as a labelled nested list.
- [ ] **Step 5:** Update footer and `sitemap.ts` `STATIC_PATHS` to include `/blog`, `/medium`, `/videos`.
- [ ] **Step 6:** Extend `e2e/public.spec.ts`: Stories button opens the menu and lists four links; keyboard (Enter, ArrowDown, Escape) works; `/news` still loads; axe finds no violations with the menu open.
- [ ] **Step 7:** Run unit tests, `npm run typecheck`, `npm run lint`, `npm run e2e:only -- public.spec.ts` → PASS. Commit.

### Task 3: Medium articles (admin-managed)

**Files:**
- Create: `supabase/migrations/20261030000000_medium_articles.sql`
- Modify: `lib/catalog/{kinds,types,schema,rows,admin,public}.ts`, `app/admin/catalog-actions.ts`, `components/admin/content-manager.tsx`, `app/admin/(console)/content/[kind]/page.tsx` and `.../content/page.tsx` (follow wherever `collaborations` is wired), `hosted-clean-install.sql`
- Create: `components/medium/medium-card.tsx`
- Modify: `app/(site)/medium/page.tsx` (replace stub)
- Test: `lib/catalog/schema.test.ts` (extend), `tests/rls/medium.test.ts` (create)

**Interfaces:**
- Produces: table `public.medium_articles(id uuid pk, title text 3..200, url text ~ '^https://', summary text ≤400, cover_path text, cover_alt text, author_name text ≤120, published_on date, visible boolean default true, sort_order int default 0, created_at, updated_at)` with the same RLS shape as `collab_projects` (public reads `visible`, admin full). `CONTENT_KINDS` gains `{ id: 'medium', label: 'Medium articles', blurb: ... }`. `interface MediumArticle { id; title; url; summary; coverPath: string|null; coverAlt: string|null; authorName: string; publishedOn: string|null; visible; sortOrder }`. `getMediumArticles(limit?: number): Promise<MediumArticle[]>` (public, cached, tag `medium`, visible only, newest `published_on` first then `sort_order`).

- [ ] **Step 1:** Read how `collaborations` / `collab_projects` is wired through each listed file; the Medium kind must follow that wiring file for file.
- [ ] **Step 2: Write failing tests:** schema test — a Medium article needs `https://` URL (rejects `javascript:` and `http://`), title length, cover alt required when a cover is set. RLS test — anonymous reads only `visible` rows; a signed-in non-admin cannot insert/update/delete; admin can.
- [ ] **Step 3:** Write the migration, mirrored into `hosted-clean-install.sql`; implement schema/rows/admin/public/actions/manager UI (Content > Medium articles, with the same show/hide, order and image upload as other kinds); `updateTag('medium')` plus `revalidatePath('/medium')` and `'/'` on save.
- [ ] **Step 4:** `MediumCard` links out with `target="_blank" rel="noopener noreferrer"` (use the existing `components/ui/external-link.tsx`) and the "opens in a new tab" hint. `/medium` lists cards, empty state "No Medium articles yet."
- [ ] **Step 5:** Run schema tests, RLS tests against local Supabase, typecheck, lint. Add an e2e in `e2e/admin.spec.ts`: admin adds an article, it appears on `/medium`; hide it, it disappears. Commit.

### Task 4: YouTube channel feed and Videos page

**Files:**
- Create: `lib/youtube/feed.ts`, `lib/youtube/feed.test.ts`, `lib/youtube/fixtures/feed.xml`, `components/videos/video-card.tsx`, `components/videos/video-player.tsx`
- Modify: `content/brand.ts` (add `YOUTUBE_CHANNEL_ID`), `app/(site)/videos/page.tsx` (replace stub), `next.config.ts` (CSP `img-src` and `images.remotePatterns` for `i.ytimg.com`)

**Interfaces:**
- Produces: `interface VideoItem { id: string; title: string; publishedAt: string; thumbnailUrl: string; watchUrl: string; embedUrl: string }`; `parseYoutubeFeed(xml: string): VideoItem[]` (pure, skips the channel-level `<title>`, decodes XML entities); `fetchChannelVideos(fetchImpl?: typeof fetch): Promise<VideoItem[]>` (throws on non-OK/invalid XML, 5 s timeout); `getChannelVideos(limit?: number): Promise<VideoItem[]>` (cached about an hour, tag `videos`; on failure returns the last good list kept in a module variable, else `[]`; never throws). `VideoPlayer({ video }: { video: VideoItem })` shows the thumbnail with a play button and swaps in the `youtube-nocookie.com` iframe (autoplay) only on click.

- [ ] **Step 1:** Save a real feed response to `fixtures/feed.xml` (curl the feed URL).
- [ ] **Step 2: Write failing tests:** `parseYoutubeFeed(fixture)` returns ≥ 1 item, first item has an 11-char id, `embedUrl` host is `www.youtube-nocookie.com`, the channel title is not an item; a hand-made entry with `&amp;` and `&#39;` in the title is decoded; malformed XML and an empty feed return `[]`; `fetchChannelVideos` with a stub fetch returning 500 throws; `getChannelVideos` with a failing fetch after one success returns the last good list.
- [ ] **Step 3:** Run → FAIL. Implement `feed.ts` (no new dependency; a small tag-scan parser is enough).
- [ ] **Step 4:** Implement the card/player and the `/videos` page: channel link button (`LINKS.youtube`), grid of cards, empty state "Videos will appear here soon."
- [ ] **Step 5:** Update CSP/remotePatterns; confirm in the dev server that thumbnails load and a click plays inline with no CSP console error.
- [ ] **Step 6:** Tests, typecheck, lint → PASS. Commit.

### Task 5: Home sections switches, video and Medium sections

**Files:**
- Create: `supabase/migrations/20261030000100_home_sections.sql`, `lib/home/sections.ts`, `lib/home/sections.test.ts`, `components/home/latest-video.tsx`, `components/home/latest-medium.tsx`, `app/admin/(console)/home/page.tsx`, `app/admin/home-actions.ts`, `components/admin/home-sections-form.tsx`
- Modify: `app/(site)/page.tsx`, `components/admin/admin-nav.tsx`, `hosted-clean-install.sql`
- Test: `tests/rls/home-sections.test.ts`

**Interfaces:**
- Produces: table `public.home_sections(id text primary key check (id in ('video','medium','blog')), enabled boolean not null default true)` seeded with the three ids; public select, admin-only write. `type HomeSectionId = 'video'|'medium'|'blog'`; `getHomeSections(): Promise<Record<HomeSectionId, boolean>>` (cached, tag `home-sections`; demo mode returns all `true`); `setHomeSectionAction(id: HomeSectionId, enabled: boolean): Promise<ActionResult>`.

- [ ] **Step 1: Write failing tests:** `sections.test.ts` — demo mode returns all true; an unknown row is ignored. RLS test — anonymous can read, cannot write; a signed-in non-admin cannot write; admin can.
- [ ] **Step 2:** Implement migration, reader, action (calls `requireAdmin()`, `updateTag('home-sections')`, `revalidatePath('/')`), admin page with three labelled switches and an "Home page" link in `admin-nav.tsx`.
- [ ] **Step 3:** `LatestVideo` (newest `getChannelVideos(1)`) and `LatestMedium` (`getMediumArticles(3)`) render **nothing at all** when their switch is off or the data is empty. Add both under `LatestSection` in `app/(site)/page.tsx` inside `Suspense fallback={null}`, using `Section` like `latest-bento.tsx`. Strings: "Our latest video", "Latest on Medium". The blog section is added in Task 12.
- [ ] **Step 4:** e2e: with the Medium switch off, `#latest-medium` is absent from `/`; on with an article present, it shows.
- [ ] **Step 5:** All checks → PASS. Commit.

### Task 6: Community database foundation and security tests

**Files:**
- Create: `supabase/migrations/20261030000200_community.sql`, `tests/rls/community.test.ts`
- Modify: `hosted-clean-install.sql`, `supabase/config.toml`

**Interfaces — produces (SQL):**
- `member_profiles(id uuid pk references auth.users on delete cascade, display_name text 2..80, bio text ≤500 default '', photo_path text, blocked boolean default false, created_at, updated_at)`; trigger on `auth.users` insert creates the row with `display_name` = email local part. Never inserts into `public.profiles`.
- `blog_posts(id uuid pk, author_id uuid references member_profiles on delete set null, title 3..160, slug unique, summary ≤300, body_md ≤50000, cover_path, cover_alt (required when cover_path), status 'draft'|'published', published_at, hidden boolean default false, like_count int default 0, created_at, updated_at)`.
- `blog_comments(id, post_id references blog_posts on delete cascade, author_id references member_profiles on delete set null, body 1..2000, hidden boolean default false, created_at)`.
- `blog_likes(post_id references blog_posts on delete cascade, user_id references member_profiles on delete cascade, created_at, primary key (post_id, user_id))`; a `SECURITY DEFINER` trigger keeps `blog_posts.like_count` correct.
- `is_verified_member() returns boolean` (`SECURITY DEFINER`): current user has `auth.users.email_confirmed_at` set and a `member_profiles` row with `blocked = false`.
- Admin functions (`SECURITY DEFINER`, each raises unless `is_admin()`): `admin_set_blog_post_hidden(p_id uuid, p_hidden boolean)`, `admin_set_blog_comment_hidden(p_id uuid, p_hidden boolean)`, `admin_set_member_blocked(p_id uuid, p_blocked boolean)`.
- `delete_my_account()` (`SECURITY DEFINER`): deletes the caller's `auth.users` row; posts and comments stay with `author_id` null.
- Rules: public sees a post only when `status='published' AND published_at<=now() AND NOT hidden` and the author is null or not blocked; public sees a comment only when not hidden, its post is visible and its author is null or not blocked; public sees a profile only when not blocked (owner always sees their own). Authors may insert/update/delete their own posts only when `is_verified_member()`; `UPDATE` privilege is granted only on `(title, slug, summary, body_md, cover_path, cover_alt, status, published_at)`, so `hidden` and `like_count` can never be set by a writer. Members update only `(display_name, bio, photo_path)` of their own profile. Insert comment/like requires `is_verified_member()` and a visible post; delete own comment, delete a comment on own post, remove own like. Admin has select-all, and no insert/update/delete on community tables apart from the three functions. Rate-limit triggers: more than 10 posts or 30 comments by one author in the last hour raises an error. Storage: members may insert/update/delete only objects under `media/members/<their uid>/` when verified; jpeg/png/webp ≤ 5 MB as today.
- `supabase/config.toml`: `[auth] enable_signup = true`, `[auth.email] enable_confirmations = true`; leave `email_sent` rate limit as is for local.

- [ ] **Step 1: Write failing tests** `tests/rls/community.test.ts` (same skip pattern and helpers as `tests/rls/rls.test.ts`; users created with the service client, one confirmed, one unconfirmed, one blocked, one admin). Assertions: (a) a new auth user gets a `member_profiles` row and **no** `profiles` row; (b) a confirmed member cannot call `admin_*` functions or `select` from `profiles` of others, cannot read other users' drafts; (c) an unconfirmed member cannot insert a post, comment or like; (d) a blocked member cannot insert, and their previously published post and comments disappear from anonymous reads; (e) a writer's `update ... set hidden=false` and `set like_count=99` are rejected; (f) admin hides a post via the function → anonymous select returns nothing, author still sees it with `hidden=true`; admin direct `update blog_posts set title=...` is rejected; (g) like twice → one row, `like_count` is 1, removing returns 0; (h) the 11th post within an hour fails; (i) `delete_my_account()` leaves the post with `author_id` null and still publicly readable; (j) a member cannot upload to another member's storage folder.
- [ ] **Step 2:** Run `npx vitest run tests/rls/community.test.ts` against local Supabase → FAIL.
- [ ] **Step 3:** Write the migration and mirror it into `hosted-clean-install.sql`; apply with `npm run db:reset`.
- [ ] **Step 4:** Run the new and existing RLS tests → PASS (existing admin behaviour unchanged). Commit.

### Task 7: Member accounts: register, log in, verify, reset, header control

**Files:**
- Create: `lib/members/session.ts`, `lib/members/schema.ts`, `lib/members/schema.test.ts`, `app/members-actions.ts`, `app/(site)/register/page.tsx`, `app/(site)/login/page.tsx`, `app/(site)/forgot-password/page.tsx`, `app/(site)/reset-password/page.tsx`, `app/auth/confirm/route.ts`, `components/members/{register-form,login-form,account-menu}.tsx`
- Modify: `proxy.ts` (session refresh for member routes), `components/layout/site-header.tsx`, `content/strings.ts`, `lib/auth/throttle.ts` (new throttles only)

**Interfaces:**
- Produces: `interface MemberContext { supabase: SupabaseClient; user: { id: string; email: string }; profile: { displayName: string; bio: string; photoPath: string|null; blocked: boolean }; verified: boolean; canPost: boolean }` (`canPost = verified && !blocked`); `getMember(): Promise<MemberContext | null>` (cached per request, verifies the token like `getAdmin`); `requireMember(next: string): Promise<MemberContext>` (redirects to `/login?next=`, `next` sanitised with `lib/auth/safe-next.ts`); zod `registerSchema` (email, password ≥ 12 chars, display name 2..80, `acceptTerms: true`), `loginSchema`; server actions `registerAction`, `memberLoginAction`, `memberLogoutAction`, `forgotPasswordAction`, `resetPasswordAction`; `registerThrottle`, `memberLoginThrottle` (same API as the existing throttles).

- [ ] **Step 1: Write failing tests** `schema.test.ts`: password under 12 chars rejected; `acceptTerms` false rejected; display name trimmed; email lower-cased.
- [ ] **Step 2:** Implement schemas and actions. Register uses `supabase.auth.signUp` with `emailRedirectTo` = `${SITE_URL}/auth/confirm`; show a "check your email" state and never reveal whether an email is already registered. `/auth/confirm` verifies the token hash and redirects to `/login?verified=1`.
- [ ] **Step 3:** `proxy.ts`: extend `config.matcher` and logic so `/login`, `/register`, `/write/:path*`, `/account/:path*` refresh the session cookies; do **not** gate or redirect `/admin` differently. Unauthenticated hits on `/write` and `/account` are redirected by `requireMember`, not by the proxy.
- [ ] **Step 4:** `account-menu.tsx` in the header utility area next to the Contact button and in the mobile menu: signed out → "Log in" and "Register"; signed in → avatar/name menu with Write, My posts, Account, Log out. Demo mode shows nothing.
- [ ] **Step 5:** e2e `e2e/members.spec.ts`: register (read the confirmation email from the local Inbucket at `http://127.0.0.1:54324`), confirm, log in, see the account menu, log out; a wrong password shows a generic error; a member visiting `/admin` is sent to `/admin/login` and cannot enter even after logging in at `/admin/login` with member credentials.
- [ ] **Step 6:** All checks → PASS. Commit.

### Task 8: Writing: editor, images, profile, my posts

**Files:**
- Create: `lib/blog/{types,schema,rows,slug,member,reading-time}.ts`, `lib/blog/{schema,slug,reading-time}.test.ts`, `lib/blog/markdown.ts`, `lib/blog/markdown.test.tsx`, `app/(site)/write/page.tsx`, `app/(site)/write/[id]/page.tsx`, `app/(site)/account/page.tsx`, `app/(site)/account/posts/page.tsx`, `app/blog-actions.ts`, `components/members/{post-editor,profile-form,my-posts}.tsx`
- Modify: `components/admin/markdown-editor.tsx` (add an optional image button via a prop, so the admin editor is unchanged), `lib/upload-path.ts` (add member path helpers)

**Interfaces:**
- Produces: `makeBlogSlug(title: string): string` → `slugify(title)` plus `-` plus 6 random hex chars, ≤ 80 chars (non-Latin titles give `post-xxxxxx`); `readingMinutes(bodyMd: string): number` (≥ 1, 200 words/min); `blogPostInputSchema` (title 3..160, summary ≤300, body ≤50,000, cover alt required with a cover); `newMemberUploadPath(userId: string, type: AllowedImageType): string` → `members/<uid>/<uuid>.<ext>` and `isValidMemberUploadPath(path: string, userId: string): boolean`; `renderBlogMarkdown` options: `blogMarkdownSchema` allows `img` only when `src` starts with the Supabase public media URL prefix (`mediaUrl('members/')`) plus everything the existing `markdownSchema` allows; `BlogBody({ md }: { md: string })`; server actions `saveBlogDraftAction`, `publishBlogPostAction`, `unpublishBlogPostAction`, `deleteBlogPostAction`, `saveProfileAction`, `createMemberUploadAction(type)` (signed upload URL like `app/admin/actions.ts:295`) — all call `requireMember` and reject when `!canPost`.

- [ ] **Step 1: Write failing tests:** `slug.test.ts` — `makeBlogSlug('Urban Flood Risk')` matches `^urban-flood-risk-[0-9a-f]{6}$`; Sinhala `'නගර සැලසුම'`, Tamil `'நகர திட்டம்'` and `'🌆🌆'` each match `^post-[0-9a-f]{6}$`; two calls differ; length ≤ 80. `reading-time.test.ts` — empty body gives 1, 1,000 words gives 5. `markdown.test.tsx` — `<script>`, `javascript:` links, `<iframe>`, an `<img>` from `https://evil.example/x.png` and raw HTML are removed; an `<img>` from the media prefix is kept; `member upload path` validator rejects another user's id and `..` segments.
- [ ] **Step 2:** Run → FAIL. Implement the helpers, the sanitiser and `BlogBody` (reusing `react-markdown`, `remark-gfm`, `rehype-sanitize`).
- [ ] **Step 3:** Build pages and components: `/write` creates a draft and redirects to `/write/[id]`; the editor has title, summary, cover upload with alt text, the Markdown toolbar with write/preview tabs and an image button, Save draft, Publish, Unpublish, Delete (confirm). `/account` edits display name, bio and photo. `/account/posts` lists the member's posts with status, a "Hidden by an admin" badge when `hidden`, and edit links. Writers who are not verified see "Verify your email to start writing" instead of the editor.
- [ ] **Step 4:** e2e `e2e/members.spec.ts` (extend): verified member writes, uploads an image, publishes; post body shows on its page (Task 9); unverified member cannot publish.
- [ ] **Step 5:** All checks → PASS. Commit.

### Task 9: Reading: Blog list, post page, author pages

**Files:**
- Create: `lib/blog/public.ts`, `app/(site)/blog/[slug]/page.tsx`, `app/(site)/blog/[slug]/opengraph-image.tsx`, `app/(site)/blog/authors/[id]/page.tsx`, `components/blog/{blog-card,author-badge}.tsx`
- Modify: `app/(site)/blog/page.tsx` (replace stub), `proxy.ts`, `app/sitemap.ts`, `lib/search-index.ts`
- Test: `lib/blog/public.test.ts`, `e2e/public.spec.ts` (extend)

**Interfaces:**
- Consumes: `BlogBody`, `readingMinutes`, `MediumArticle`-style card patterns.
- Produces: `interface AuthorRef { id: string; displayName: string; photoPath: string|null; bio: string }`; `interface BlogPost { id; slug; title; summary; bodyMd; coverPath; coverAlt; publishedAt; likeCount; commentCount; readingMinutes; author: AuthorRef | null }` (null author renders as "Former member"); `listBlogPosts(q?: { limit?: number; offset?: number; authorId?: string }): Promise<{ posts: BlogPost[]; total: number }>` (cached, tag `blog`); `getBlogPost(slug: string): Promise<BlogPost | null>` (tags `blog`, `blog:<slug>`); `getAuthor(id: string)`; `getBlogSlugIndex()`. Reads rely on the RLS visibility rule only; demo mode returns empty.

- [ ] **Step 1: Write failing tests** for the pure mapping (row → `BlogPost`, null author → "Former member"). E2E: a published post appears on `/blog`, on its page with author, date, reading time, and on the author's page; unknown or hidden slug gives HTTP 404; share metadata (title, description, OG image) present.
- [ ] **Step 2:** Implement reads, pages and the OG image (copy the pattern of `app/(site)/news/[slug]/`). Extend `proxy.ts` with a `/blog/:slug` existence check like `newsSlugExists` so unknown/hidden slugs return a real 404 status.
- [ ] **Step 3:** Add live blog posts to `sitemap.ts` and `buildSearchIndex` (new group `'blog'`; update `SearchEntry` and the palette's group labels) and Medium articles to the search index.
- [ ] **Step 4:** All checks → PASS. Commit.

### Task 10: Comments and likes

**Files:**
- Create: `lib/blog/engage.ts`, `lib/blog/engage.test.ts`, `components/blog/{comments,like-button}.tsx`, `app/engage-actions.ts`
- Modify: `app/(site)/blog/[slug]/page.tsx`

**Interfaces:**
- Produces: `commentInputSchema` (body 1..2000 after trim); server actions `addCommentAction(postId, body)`, `deleteCommentAction(commentId)`, `toggleLikeAction(postId): Promise<ActionResult<{ liked: boolean; likeCount: number }>>`; `listComments(postId: string): Promise<BlogComment[]>` with `interface BlogComment { id; postId; body; createdAt; author: AuthorRef | null }` (flat, oldest first); `getMyLike(postId): Promise<boolean>`. Actions call `getMember()`; unverified/blocked/signed-out callers get a message and a login link, never a thrown error. Each action does `updateTag('blog:<slug>')`.

- [ ] **Step 1: Write failing tests:** comment body trimmed and empty/over-long rejected; comment rendered as plain text (HTML in a comment is shown escaped, links not clickable).
- [ ] **Step 2:** Implement. Comments render as text, not Markdown. The like button is optimistic, disabled for signed-out users with a "Log in to like" link; the comment form is replaced by a login or verify prompt when `!canPost`. Show a delete control to the comment's author and the post's author.
- [ ] **Step 3:** E2E: second member comments and likes; counts update; double-clicking like does not double count; signed-out user sees the prompt.
- [ ] **Step 4:** All checks → PASS. Commit.

### Task 11: Admin moderation

**Files:**
- Create: `app/admin/(console)/community/page.tsx`, `app/admin/(console)/community/comments/page.tsx`, `app/admin/(console)/community/members/page.tsx`, `app/admin/community-actions.ts`, `lib/blog/admin.ts`, `components/admin/{moderation-table,visibility-switch}.tsx`
- Modify: `components/admin/admin-nav.tsx`, `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: DB functions from Task 6.
- Produces: `adminListBlogPosts(supabase)`, `adminListComments(supabase)`, `adminListMembers(supabase)`; actions `setBlogPostHiddenAction(id: string, hidden: boolean)`, `setCommentHiddenAction(id, hidden)`, `setMemberBlockedAction(id, blocked)` — each `requireAdmin()` first, calls the matching RPC, then `updateTag('blog')`, `updateTag('blog:<slug>')`, `revalidatePath` for `/blog`, `/` and the sitemap. There is no edit control anywhere on these pages; each row shows title or excerpt, author, date, and a link to view the public page.

- [ ] **Step 1: Write failing e2e** (admin spec): member publishes; admin hides it from Community > Posts; within 15 s (`eventually` helper) `/blog` and `/blog/<slug>` (404) no longer show it; the author sees "Hidden by an admin" in My posts; admin unhides and it returns. Hide a comment; block a member → their posts and comments vanish and they cannot publish.
- [ ] **Step 2:** Implement pages and actions; add "Community" to `admin-nav.tsx`.
- [ ] **Step 3:** All checks and the e2e → PASS. Commit.

### Task 12: Home "Latest blog articles" section

**Files:**
- Create: `components/home/latest-blog.tsx`
- Modify: `app/(site)/page.tsx`, `e2e/public.spec.ts`

**Interfaces:** Consumes `getHomeSections()` (Task 5) and `listBlogPosts({ limit: 3 })` (Task 9).

- [ ] **Step 1: Write failing e2e:** with the `blog` switch on and a live post, `/` shows "Latest from the community" with the card; hiding the post (or switching the section off) removes the whole section including its heading.
- [ ] **Step 2:** Implement `LatestBlog` rendering nothing when off/empty; place it after `LatestMedium`.
- [ ] **Step 3:** All checks → PASS. Commit.

### Task 13: Terms, Privacy and account deletion

**Files:**
- Create: `app/(site)/terms/page.tsx`, `app/(site)/privacy/page.tsx`, `app/(site)/account/delete/page.tsx`, `components/members/delete-account-form.tsx`, `content/legal.ts`
- Modify: `components/members/register-form.tsx`, `components/layout/site-footer.tsx`, `app/members-actions.ts`, `app/sitemap.ts`

**Interfaces:** Produces `deleteMyAccountAction(): Promise<ActionResult>` (calls `rpc('delete_my_account')`, signs out, redirects to `/`). `content/legal.ts` holds the Terms and Privacy text; each page shows a visible banner "Draft: needs review by the SmartMind team before launch."

- [ ] **Step 1: Write failing e2e:** the register form's terms checkbox links to `/terms` and `/privacy`; deleting the account signs out, the member can no longer log in, their published post still shows "Former member".
- [ ] **Step 2:** Write plain draft legal text (what is collected: email, name, photo, posts, comments, likes; who can see it; hidden-by-admin rule; how to delete; contact link to `/contact`). Implement the action, form with a typed confirmation ("DELETE"), footer links.
- [ ] **Step 3:** All checks → PASS. Commit.

### Task 14: Setup guide, final verification

**Files:**
- Create: `docs/community-setup.md`
- Modify: `README.md` (link to the guide), `.env.example` (only if a new variable was introduced)

- [ ] **Step 1:** Write `docs/community-setup.md` for the owner: Supabase dashboard steps (turn on email sign-ups, confirm-email on, set Site URL and redirect URL `<site>/auth/confirm`, run the new migration SQL in the SQL editor), connecting an SMTP provider (Authentication → Emails → SMTP Settings; Resend or Brevo with a verified sender, Gmail app-password SMTP as a quick stopgap), raising the email rate limit afterwards, optional CAPTCHA, and `npm run create-admin` for the admin account.
- [ ] **Step 2:** Run the full suite: `npm run typecheck && npm run lint && npm test && npm run e2e`. Manual pass at 390px and 1440px in light and dark: Stories dropdown, `/blog`, a post page, `/write`, home with all sections on and all off.
- [ ] **Step 3:** Run `npm run check:contrast`. Fix any failures in the new components. Commit.
