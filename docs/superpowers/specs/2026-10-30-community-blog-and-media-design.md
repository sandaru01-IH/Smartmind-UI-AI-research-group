# Community blog, Medium articles, YouTube feed and home-page changes

Date: 2026-10-30. Site: SmartMind website (Next.js 16, Supabase, Tailwind). Read `AGENTS.md` first: this Next.js version differs from what most builders know, so read the relevant guide in `node_modules/next/dist/docs/` before writing code.

## Why

The team lead asked for a blog on the SmartMind site where participants can write and publish. About ten people will write regularly about their expert knowledge and research work. The site should also show the research group's YouTube channel and a set of Medium articles. The owner wants all of this reachable without adding several new tabs to a top bar that already has 8 items plus Contact.

## Scope

Five pieces. They share navigation, the admin panel and the home page, so they are one project.

1. **Headline change** (small, do first).
2. **Navigation:** one new top-bar item with a dropdown.
3. **Community blog:** public sign-up, writing, reading, comments, likes.
4. **Medium articles** added by the admin.
5. **YouTube channel feed** pulled automatically.
6. **Home page sections** for the latest video and latest blog articles, each switchable on or off in the admin.

### 1. Headline change

In `content/philosophy.ts`, `line` changes from "Understanding Complex Cities with Intelligence + Love." to:

> Understanding Complex Cities and Designing Adaptive, Dynamic Systems & applications for Sustainable Cities and Livable Communities — with Super Intelligence + Great Love.

This is a much longer line than before. Check how it displays on the home hero and everywhere else that `line` is used (about page, footer, metadata/OG image, search index) at mobile and desktop widths, and fix any overflow. Keep the other `philosophy.ts` headlines unchanged (only `line` was requested). The text also appears in `update content.txt` (an untracked notes file; leave it alone).

### 2. Navigation (decided by the owner: a dropdown)

- Add **one** item to the top bar. Choose the name; suggested "Stories" or "Insights" (builder's call, shown to the owner for approval). It opens a dropdown under it, on hover/focus on desktop and on tap.
- Dropdown entries: **Blog**, **Medium articles**, **Videos**, **News**. News moves from its own top-bar item into this dropdown (confirmed by the owner; `/news` URLs must keep working).
- Must work with keyboard and screen readers, on touch devices, and in the mobile menu (there the entries appear as a nested group). Update `components/layout/nav-items.ts`, `site-header.tsx`, the footer, the command palette and the sitemap/search index to match.
- Each dropdown entry is a real page with its own URL.

### 3. Community blog

**Accounts.** Anyone on the internet may register with email and password, log in, and log out. Email must be verified before the account can write, comment or like. Password reset is required. Sign-up, login and posting must be rate limited. Today Supabase sign-ups are disabled in `supabase/config.toml` and every user is an admin (`profiles.role` only allows `'admin'`). Opening sign-ups is the biggest risk in this project: **no ordinary account may ever gain admin rights or see admin data.** Keep ordinary users in a separate profile table or a separate role that existing admin policies (`public.is_admin()`) do not treat as admin, and write database tests for it.

**Writers can:**
- Register, log in, and see a "Write" entry point and a "My posts" page.
- Create a post with: title, short summary, cover image (with alt text), and body written in a rich editor with headings, bold, italic, lists, quotes, links and images placed inside the text.
- Save as a draft, publish, edit later, unpublish, and delete their own posts.
- Edit a small public profile: display name, photo, short bio.

**Readers can:**
- Read a post on its own page showing author name and photo, date and reading time. Posts have clean URLs and proper share previews (title, summary, cover).
- Open an author page listing that author's posts.
- Comment on a post and like a post. Reading needs no account. Commenting and liking need a verified account (the designer's assumption, not stated by the owner). One like per person per post, and a person can remove it.
- Writers can delete comments on their own posts and anyone can delete their own comments.

**Moderation (decided by the owner):** posts go live as soon as the writer publishes, with no approval step. The admin **cannot edit anyone's text.** The admin can only switch a post's visibility between visible and hidden, and the same for comments. Hidden items disappear from every public page, listing, feed, search index and sitemap but stay in the database. The writer should see that their post is hidden by the admin. The admin list shows all posts and comments with author, date, and a visibility switch.

**Content safety.** Body content is user-supplied and must be sanitised on render (the project already uses `react-markdown` with `rehype-sanitize`; any new editor format must be equally safe). Image uploads are limited by type and size (existing `media` bucket allows jpeg/png/webp up to 5 MB, admin-only today; writers need their own write access limited to their own folder).

**Keep separate from News.** The existing `posts` table and admin editor stay as they are for the team's own news. Community posts are a separate kind of content so that "News" stays the team's voice.

### 4. Medium articles

The admin adds, edits, reorders, hides and deletes Medium articles from the admin panel. Each has: title, link to the Medium article, cover image, short summary, author name, publish date. On the site each appears as a card that opens Medium in a new tab (Medium cannot be shown in full on the site). Listing page: Stories → Medium articles.

### 5. YouTube channel

Channel: https://www.youtube.com/@SmartMindUIAI, channel id `UCN7fW6O_yGOuJrma_B4ywlA`. The public feed `https://www.youtube.com/feeds/videos.xml?channel_id=UCN7fW6O_yGOuJrma_B4ywlA` works without an API key and returns the newest videos (tested 2026-10-30). The site fetches this feed on the server with caching (about an hour) so it stays current without admin work, and shows the result on the Videos page as playable cards. A video plays on the site without loading YouTube's player until the visitor clicks (use the privacy-friendly `youtube-nocookie.com` embed). If YouTube is unreachable, show the last good result or hide the section, never an error. The channel link appears on the Videos page. The footer already links the channel (check and keep consistent).

### 6. Home page

The existing "Latest" news section stays as it is. Below it add:
- **Latest video:** one playable card for the newest channel video.
- **Latest blog articles:** the newest few community posts. Whether Medium articles appear in this same section or in their own is the builder's call; the admin must be able to control it either way.

In the admin each home section has an on/off switch. A section that is off, or has nothing to show, does not render at all (no empty heading). Follow the existing pattern in `components/home/latest-bento.tsx`.

## Admin panel additions

Under the existing admin console, add: Community posts (visibility switch), Comments (visibility switch), Medium articles (full create/edit/delete), and Home sections (the on/off switches). Only admins reach these. Follow the existing admin layout and `requireAdmin()` pattern, and keep row-level security as the real enforcement, not just the UI.

## Goals

- Ten non-technical experts can sign up and publish a good-looking post without help.
- Visitors can find blog, Medium and video content in one click from the top bar without it crowding the nav.
- The admin can remove inappropriate content within a minute, from one place.
- Nothing empty or broken ever shows on the public site.

## Non-goals

- Admin editing of other people's text.
- Pre-publication approval of posts.
- Following authors, notifications, newsletters, paid or private posts, analytics dashboards.
- Importing Medium article bodies; embedding the full Medium text.
- Sinhala/Tamil translation (strings are English only today; keep strings in `content/strings.ts`).

## Anti-goals (a failure even if it technically works)

- A way for a self-registered user to reach admin pages or see/alter admin data.
- Spam or abusive posts that cannot be hidden quickly, or that stay visible after being hidden.
- The top bar growing by more than one item.
- The site getting slow or the home page layout shifting because of the YouTube fetch.
- Visible empty sections on the home page.

## Constraints

- Stay on the existing stack: Next.js 16, React 19, Supabase (auth, Postgres with row-level security, storage), Tailwind, `zod`. New dependencies (for example a rich-text editor) are the builder's choice and should be small and justified.
- Must still run in the existing "demo mode" with no Supabase configured (see `hasSupabase()`), where community features show a sensible disabled state.
- Database changes go in a new file in `supabase/migrations/` and are mirrored in `hosted-clean-install.sql` if that file is kept in step with them. Existing tests, typecheck, lint and e2e must keep passing; add tests for the security rules and the new pages.
- Accessibility: the project checks contrast and runs axe in e2e. Keep to it.

## What the owner decided

- Dropdown navigation under one new top-bar item.
- Open registration for anyone on the internet.
- Writers have a rich blog editor with the usual blog features.
- Readers can comment and like.
- The admin only controls visibility, never content.
- YouTube pulled automatically from the channel; Medium articles entered by the admin.
- Home sections toggle from the admin and vanish when empty.

## Left to the builder

Dropdown label, rich-text editor choice and storage format, database table design, rate-limit mechanism, comment threading depth (flat is fine), page layout and styling in keeping with the existing design, how the feed is cached, and the order of delivery. Suggested order: headline, navigation, Medium + home toggles, YouTube, then accounts/blog/comments/likes/moderation last, since that is the largest and riskiest part.

## Calls made by the designer (the owner read these and accepted them)

- Community accounts live in the **same Supabase project and auth user pool** as the admins, but in their own profile table. Ordinary accounts never get an admin role. An admin who also wants to write uses the same login; the admin console stays at `/admin`.
- The admin can also **block an account**: one switch hides that person's profile, posts and comments and stops them posting. This serves the "hide quickly" anti-goal, since open sign-up lets one spammer make many posts. Content is hidden, not deleted.
- **Account control in the header:** Log in / Register (or the user's avatar menu with Write, My posts, Log out) sits in the utility area beside the Contact button and in the mobile menu. It does not count as a top-bar navigation item.
- **Legal pages:** add simple Terms and Privacy pages with draft text for the owner to review before launch, a link to them on the sign-up form, and a self-service "delete my account" that removes the profile and anonymises the person's posts and comments as "Former member". The draft text must be marked as needing the owner's review.
- **Email delivery is a prerequisite, not part of the build.** Verification and password-reset emails need an SMTP provider connected to the hosted Supabase project (its built-in sender is limited to a few emails an hour). The owner has not named a provider and accepted this being treated as a setup step: the plan must list it early as something the owner arranges, with the Supabase dashboard steps (enable sign-ups, turn on confirmations, set redirect URLs, connect SMTP) written out. Build and test locally with Supabase's local mail inbox until then.
- The owner left the choice of the dropdown label to the designer: use "Stories" unless told otherwise.
