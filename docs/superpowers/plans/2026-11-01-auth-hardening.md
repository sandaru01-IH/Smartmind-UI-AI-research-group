# Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the confirmed bugs and security weaknesses in member/admin sign-up, email confirmation, login, password reset and the header session check, and tighten the database rules a registered member can reach.

**Architecture:** Small pure helpers (`lib/auth/*`) carry the decisions and are unit-tested; the server actions in `app/members-actions.ts` and `app/admin/actions.ts` call them. Client fixes stay inside the existing components. Database changes ship as new, append-only migrations covered by the existing `tests/rls` suite (needs local Supabase on Docker, already running). Every behaviour that crosses the browser (double click, form values, request counts) is pinned by a Playwright test in `e2e/members.spec.ts` using the Mailpit helpers in `e2e/members-support.ts`.

**Tech Stack:** Next.js 16.4.3 (App Router, `proxy.ts`, Server Actions), React 19.3, Supabase (`@supabase/ssr`, GoTrue), zod 4, vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/auth-audit/` — `cto-ledger.md` (index, live-reproduced findings C1–C8 and refuted R1–R3), `appsec-report.md` (F-xx), `db-rls-report.md` (F-xx), `frontend-mail-report.md` (F-xx). Task headings below cite them as `AppSec F-02`, `DB F-03`, `FE F-04`, `CTO C1`. Runnable reproductions: `docs/superpowers/specs/auth-audit/probes/`.

## Global Constraints

- AGENTS.md: this Next.js has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before using an API you are not certain of.
- The service-role key never appears in `app/`, `components/`, `lib/` (`tests/security/no-service-key.test.ts` enforces it).
- All user-facing copy lives in `content/strings.ts` (`t.members.*`, `t.blog.*`); no new hard-coded English in actions or components.
- Do not edit `components/layout/site-header.tsx` or any untracked file on `master` (the owner has uncommitted work there).
- New SQL goes in new files `supabase/migrations/2026110100NNNN_*.sql`; never edit an applied migration. After a migration, `npx supabase db reset` (local only) must succeed and `npx vitest run tests/rls` must pass.
- Match surrounding code: terse doc comments that explain why, no decorative comments, existing naming (`*Action`, `*Throttle`, `MemberFormState`).
- Every task: failing test first and seen failing, minimal fix, `npx tsc --noEmit` clean, `npx vitest run` green, `npx eslint` clean on touched files, one commit.
- No push, merge, deploy, or hosted-database change by any task.

## Review Focus

- A confirmation or reset link opened twice (mail scanner, then person; or a double click): the second use must never turn a success into "expired".
- Supabase answering 429 or 5xx (email quota, rate limit, outage): the person must be told the truth, the lockout counters must not count it as a wrong password, and the server must log it.
- A request with no usable client-IP header: must not land every visitor in one shared throttle bucket.
- A signed-in member, or nobody, opening `/reset-password` directly: must not be able to set a password without a fresh recovery session.
- Hostile `display_name` / `photo_path` / `next` values (zero-width, RTL override, tab, `../`, another member's folder): rejected or neutralised in the database or helper, not only in the form.

## File Structure

- Create `lib/auth/client-ip.ts`, `lib/auth/auth-errors.ts`, `lib/auth/recovery-session.ts` (+ `*.test.ts` beside each): pure decisions, no I/O.
- Create `components/members/confirm-button.tsx`: client submit button with pending state.
- Modify `lib/members/schema.ts`, `lib/auth/safe-next.ts`, `lib/auth/throttle.ts`, `app/members-actions.ts`, `app/admin/actions.ts`, `app/(site)/auth/confirm/page.tsx`, `app/(site)/reset-password/page.tsx`, `app/(site)/login/page.tsx`, `components/members/{member-forms,auth-fields,account-menu,delete-account-form}.tsx`, `content/strings.ts`, `scripts/create-admin.ts`, `supabase/config.toml`, `docs/community-setup.md`.
- Create `supabase/migrations/20261101000000_member_hardening.sql`, `20261101000100_media_listing.sql`; extend `tests/rls/community.test.ts`.

---

### Task 1: Safe redirect targets (CTO C1, AppSec F-02)

**Files:**
- Modify: `lib/members/schema.ts` (`safeMemberNext`), `lib/auth/safe-next.ts` (`safeNext`)
- Test: `lib/members/schema.test.ts`, `lib/auth/auth-logic.test.ts`

**Interfaces:**
- Produces: `safeMemberNext(value: string | null | undefined): string` and `safeNext(...)`, same signatures, now returning a same-origin path (`pathname + search + hash`) or the fallback.

- [ ] **Step 1: Write failing tests.** `safeMemberNext` returns `'/'` for `'/\t/evil.example'`, `'/\n/evil.example'`, `'/\r/evil.example'`, `'/\u0000/x'`, `'/​/x'` is allowed only if it stays same-origin (assert result never parses to another origin: `new URL(out, 'http://site.test').origin === 'http://site.test'` for every case in the table, including `'//evil.example'`, `'/\\evil.example'`, `'/..//evil'`, `'/admin'`, `'/admin?x=1'`, `'/account?tab=1#top'` which must be returned unchanged). Same table for `safeNext` with fallback `'/admin'`; `'/admin/posts/1?x=1'` unchanged.
- [ ] **Step 2: Run** `npx vitest run lib/members lib/auth` — expect the control-character cases to FAIL.
- [ ] **Step 3: Implement.** Reject any `/[\u0000-\u001F\u007F]/` first; then `new URL(value, 'http://x')` and require `origin === 'http://x'`; return the original value only when it equals `pathname + search + hash`, else the fallback. Keep the existing `/admin` and length rules.
- [ ] **Step 4: Run tests** — PASS; run `probes/probe-redirect.mjs` is NOT part of CI, instead add the e2e in Task 3's spec file: logging in with `?next=` containing a TAB ends on `/`, never on another origin.
- [ ] **Step 5: Commit** `fix(auth): refuse control characters in post-login redirect targets`.

### Task 2: Trusted client IP, honest error mapping, no shared bucket (AppSec F-01/F-10/F-11/F-16, FE F-02/F-11)

**Files:**
- Create: `lib/auth/client-ip.ts`, `lib/auth/auth-errors.ts` and tests beside them
- Modify: `app/members-actions.ts` (`clientKey`, `registerAction`, `memberLoginAction`, `forgotPasswordAction`, `wait`), `app/admin/actions.ts` (login IP + 429), `content/strings.ts`

**Interfaces:**
- Produces:
  - `clientIpFrom(h: Pick<Headers, 'get'>): string | null` — prefers `x-vercel-forwarded-for`, then `x-real-ip`, then the first `x-forwarded-for` entry; `null` when none is a plausible IP (IPv4/IPv6 literal check).
  - `type AuthFailure = 'rate_limited' | 'send_failed' | 'weak_password' | 'same_password' | 'not_confirmed' | 'bad_credentials' | 'other'`; `classifyAuthError(e: { status?: number; code?: string; message?: string } | null): AuthFailure` — `over_request_rate_limit`, `over_email_send_rate_limit`, status 429 → `rate_limited`; status ≥ 500, `unexpected_failure`, `email_address_not_authorized`, message matching /sending .* email/i → `send_failed`; `weak_password`; `same_password`; `email_not_confirmed` → `not_confirmed`; `invalid_credentials` → `bad_credentials`.
- Consumes: nothing.

- [ ] **Step 1: Failing unit tests** for both helpers (table-driven; include a spoofed `x-forwarded-for: 1.2.3.4, 9.9.9.9`, a header holding `not-an-ip`, and an empty header set → `null`).
- [ ] **Step 2: Run** `npx vitest run lib/auth` — FAIL (modules missing).
- [ ] **Step 3: Implement the helpers**, then rewire the actions: throttle keys use the IP when present, otherwise the normalised email alone (never the literal `'unknown'`); `registerThrottle`/`resetThrottle` key `ip ?? email`. Use `SITE_URL` for `emailRedirectTo`/`redirectTo` and delete the `origin` header read. `registerAction`: map `rate_limited`/`send_failed` to new strings `t.members.tryLater` / `t.members.mailFailed`, `weak_password` to a password field error, keep "already registered" silent. `forgotPasswordAction`: read the result; `rate_limited` and `send_failed` get the same two messages (they reveal nothing about the account) and are `console.error`-logged with `code`/`status` only (no email, no token). `memberLoginAction` and admin `loginAction`: a `rate_limited`/`send_failed` outcome returns `tryLater`/`unavailable` and does NOT call `*.fail()`. Wrap the three supabase calls in try/catch → `t.members.unavailable`. Replace `wait()` with a `t.members.tooManyAttempts(minutes)` string helper that pluralises.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — PASS.
- [ ] **Step 5: Commit** `fix(auth): trusted client IP, truthful Supabase error handling, no shared throttle bucket`.

### Task 3: Confirm/reset link survives double use (CTO F-05 live-reproduced, AppSec F-01/F-07, FE F-05/F-10/F-14)

**Files:**
- Create: `components/members/confirm-button.tsx`
- Modify: `app/members-actions.ts` (`confirmLinkAction`, remove `verifyLinkToken`), `app/(site)/auth/confirm/page.tsx`, `app/(site)/login/page.tsx`, `content/strings.ts`
- Test: `e2e/members.spec.ts`

**Interfaces:**
- Produces: `<ConfirmButton label: string />` (client; `useFormStatus`, disabled + spinner while pending, same `buttonClass('primary','w-full')`).

- [ ] **Step 1: Failing e2e tests** (reuse `members-support.ts` Mailpit helpers): (a) sign-up link, `dblclick` on the confirm button → exactly one POST and final URL `/login?verified=1`; (b) reset link, `dblclick` → ends on `/reset-password`, never `/forgot-password`; (c) bad `token_hash` ×1 click → `/login?error=confirm` with at most ONE verifyOtp-equivalent round trip (assert via a `page.route` counter on `**/auth/v1/verify`); (d) login with `?next=%2F%09%2Fevil.example` ends on a same-origin URL.
- [ ] **Step 2: Run** `npx playwright test e2e/members.spec.ts -g "confirm"` — FAIL.
- [ ] **Step 3: Implement.** `confirmLinkAction` calls `verifyOtp` once with the link's `type`, accepting only `email | signup | recovery | magiclink | invite` (anything else → `/login?error=confirm`). On error classify it: `rate_limited` → `/login?error=busy` (new notice `t.members.confirmBusy`), else the existing destinations. Non-recovery success: `signOut({ scope: 'local' })` then `/login?verified=1`. `page.tsx`: use `ConfirmButton`; the reset title is `t.members.resetTitle`. Drop the `code`/PKCE branch only if no template emits it (it does not: delete it and its `reset = Boolean(code)` case).
- [ ] **Step 4: Run** the e2e tests and `npx vitest run` — PASS.
- [ ] **Step 5: Commit** `fix(auth): one-shot link verification, pending state, no false "expired" on double click`.

### Task 4: Reset-password and session hygiene (AppSec F-05/F-09/F-13, FE F-07/F-09)

**Files:**
- Create: `lib/auth/recovery-session.ts` + test
- Modify: `app/members-actions.ts` (`resetPasswordAction`, `memberLogoutAction`, `deleteMyAccountAction`), `app/admin/actions.ts` (`logoutAction`, non-admin rejection), `app/(site)/reset-password/page.tsx`, `components/members/member-forms.tsx` (`ResetPasswordForm` end state), `lib/auth/throttle.ts` (add `passwordChangeThrottle`: 5 per hour keyed on user id)
- Test: `e2e/members.spec.ts`

**Interfaces:**
- Produces: `isRecentRecovery(amr: unknown, nowSeconds: number, maxAgeSeconds?: number): boolean` — true when `amr` is an array containing an entry whose `method` is `'otp'` or `'recovery'` and `timestamp` is within `maxAgeSeconds` (default 900) of `nowSeconds`.

- [ ] **Step 1: Failing tests.** Unit: `isRecentRecovery` with fresh/stale/missing/garbage `amr` (first, run `probes` style check against local GoTrue to confirm the real `amr` shape after a recovery `verifyOtp`, and put that shape in the test). E2E: (a) a member logged in with a password (no recovery) opening `/reset-password` is redirected to `/forgot-password?error=expired`; (b) full reset flow ends logged in on `/account` with the success notice and a second browser context's session is signed out; (c) logout in one context leaves a second context signed in.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** The page and the action both read `getClaims()`; no fresh recovery → redirect/`resetExpired` with a link to `/forgot-password`. After `updateUser` succeeds: `signOut({ scope: 'others' })`, throttle, then redirect to `/account?password=changed`. Logout, admin-login rejection and admin logout use `scope: 'local'`. `deleteMyAccountAction`: refuse admins before touching storage; call the RPC first and remove the photo only on success.
- [ ] **Step 4: Run** unit + e2e — PASS.
- [ ] **Step 5: Commit** `fix(auth): password change needs a fresh recovery session; local sign-out; safe account deletion order`.

### Task 5: Forms keep what people typed; truthful labels and focus (CTO C2, FE F-04/F-12/F-13)

**Files:**
- Modify: `app/members-actions.ts` (`MemberFormState` gains `values?: Record<string,string>`; every non-done return of register/login/forgot echoes non-secret fields), `components/members/member-forms.tsx`, `components/members/auth-fields.tsx`, `content/strings.ts` (`forgotBusy`, `resetBusy`)
- Test: `e2e/members.spec.ts`

**Interfaces:**
- Produces: `MemberFormState.values` — never contains a password.

- [ ] **Step 1: Failing e2e.** Invalid register (short password): name, email and the terms checkbox keep their values, password is empty and focused, `aria-invalid="true"` on the password input and the error is announced via `aria-describedby`. Wrong-password login keeps the email. Forgot with a typo keeps the email. Pending labels on forgot/reset are not "Logging in".
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with `defaultValue`/`defaultChecked` from `state.values`; add `aria-invalid`/`aria-describedby` to all fields (email and displayName included), an invalid style class, focus the first invalid field in an effect keyed on `state`, give the Done panel `tabIndex={-1}` and focus it, and drop the duplicate `aria-live` + `role="alert"` pair in `FormMessage`.
- [ ] **Step 4: Run** e2e + `npx vitest run` — PASS.
- [ ] **Step 5: Commit** `fix(auth): forms keep typed values; accessible errors and focus`.

### Task 6: Resend path and honest register copy (CTO C3/C4, FE F-03/F-08)

**Files:**
- Modify: `app/members-actions.ts` (new `resendConfirmationAction(prev: MemberFormState, fd: FormData): Promise<MemberFormState>`), `lib/auth/throttle.ts` (`resendThrottle`: 3 per hour keyed `ip ?? email`, plus per-email key), `components/members/member-forms.tsx` (`ResendForm`, shown in the register Done panel and on `/login?error=confirm` and for the not-confirmed login error), `app/(site)/login/page.tsx`, `content/strings.ts`
- Test: `e2e/members.spec.ts`

**Interfaces:**
- Consumes: `classifyAuthError` (Task 2). Uses `supabase.auth.resend({ type: 'signup', email })`; answer is always the neutral "If that address is waiting for confirmation, we sent a new link."

- [ ] **Step 1: Failing e2e.** (a) Register, empty the Mailpit inbox, press "Send the link again": exactly one new message arrives. (b) Registering an already-confirmed address shows copy that names "Log in" and "Forgot your password?" links. (c) Third resend within the hour shows the too-many message.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** as above; rewrite `t.members.registerDone` so it states the address the link went to, links to login/forgot, and mentions spam and the resend button.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(auth): resend confirmation email; clearer registration outcome`.

### Task 7: One session check per page, no logout flicker (CTO C8, FE F-06/F-07/F-15)

**Files:**
- Modify: `components/members/account-menu.tsx` only
- Test: `e2e/members.spec.ts`

- [ ] **Step 1: Failing e2e.** Count `**/api/me` requests via `page.on('request')`: full page load while signed out ≤ 1, signed in ≤ 1, each client-side navigation ≤ 1, opening the mobile menu 0 extra. After logout from `/` the menu shows "Log in" and stays so for 3 s with no `/api/me` returning signed-in. A transient 500 from a stubbed `/api/me` keeps the previously known state.
- [ ] **Step 2: Run** — FAIL (currently 2 on load).
- [ ] **Step 3: Implement.** Render `{watcher}` once at the top of every branch of `AccountMenu` and `MobileAccountLinks` so it never remounts; share one in-flight promise at module level; add a `loggingOut` ref that suppresses fetches until the logout action settles; keep the last good value on non-OK responses.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `fix(header): single /api/me call per view, stable logout`.

### Task 8: Throttle memory and lockout fairness (AppSec F-06/F-08)

**Files:**
- Modify: `lib/auth/throttle.ts`; Test: `lib/auth/auth-logic.test.ts`

- [ ] **Step 1: Failing tests.** After 6000 distinct keys each with one stale failure (older than `windowMs`), `size` is bounded (expose `size(): number` on the throttle object); a locked record is kept until `lockedUntil`; hard cap 5000 evicts oldest first.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** time-based pruning on eviction plus an insertion-ordered cap. Doc comment states that the store is per-instance and a shared store is the follow-up.
- [ ] **Step 4: Run** `npx vitest run lib/auth` — PASS.
- [ ] **Step 5: Commit** `fix(auth): bound throttle memory`.

### Task 9: Member data hardening migration (DB F-01/F-02/F-03/F-04/F-14/F-15/F-16/F-18, CTO C7)

**Files:**
- Create: `supabase/migrations/20261101000000_member_hardening.sql`
- Test: `tests/rls/community.test.ts` (new `describe('member hardening')`)

**Interfaces:**
- Produces SQL: `public.clean_display_name(text) returns text`; check constraints `member_photo_own_folder`, `member_display_name_clean`; `public.member_is_public(uuid) returns boolean` (confirmed, not blocked, not in `public.profiles`); replacement policies; indexes `blog_comments_author_idx`, `blog_likes_user_idx`, `blog_posts_author_created_idx`.

- [ ] **Step 1: Failing RLS tests** (as members created with the service client, and as anon): member cannot set `photo_path` to `covers/...`, `../x`, or another member's folder (own `members/<uid>/<uuid>.png` allowed); `display_name` `'Smartmind Team'`, `'Admin'`, `'ab'+U+200B`, RTL-override text rejected, `'Ada Lovelace'` allowed; unconfirmed member cannot update their profile; anon `select` of `member_profiles` returns neither unconfirmed members nor admins; blog authors with live posts still resolve for anon; post author cannot delete a comment the admin hid; signup via `/auth/v1/signup` with `data: {display_name: '<script>'}` still creates a profile (trigger never aborts signup).
- [ ] **Step 2: Run** `npx vitest run tests/rls/community.test.ts` — FAIL.
- [ ] **Step 3: Write the migration** following the snippets in `db-rls-report.md` F-01–F-04, F-14–F-16, F-18, adding `not valid` + `validate constraint` after normalising existing rows (admins renamed `'Smartmind team'`). `handle_new_member` falls back to `'Member'`, never the email local part, and swallows constraint failures into the fallback name. Revoke execute on the listed trigger functions.
- [ ] **Step 4: Run** `npx supabase db reset` then `npx vitest run tests/rls` and `npx playwright test e2e/members.spec.ts` (blog author pages still render) — PASS.
- [ ] **Step 5: Commit** `fix(db): constrain member paths and names, hide unconfirmed and admin profiles, add indexes`.

### Task 10: Media bucket is no longer listable (DB F-05)

**Files:**
- Create: `supabase/migrations/20261101000100_media_listing.sql`; Test: `tests/rls/rls.test.ts` + `e2e/admin.spec.ts` (existing upload scenarios must still pass)

- [ ] **Step 1: Failing tests.** anon `storage.from('media').list('covers')` returns an empty list while a known public URL still serves 200; admin can still list; a member lists only `members/<own uid>`; an `upsert: true` re-upload by the owner still works.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the policy swap from DB F-05 verbatim, then check the `upsert` caveat noted there.
- [ ] **Step 4: Run** `npx vitest run tests/rls` and `npx playwright test e2e/admin.spec.ts e2e/members.spec.ts` — PASS.
- [ ] **Step 5: Commit** `fix(db): stop anonymous listing of the media bucket`.

### Task 11: Safer `create-admin` and a configuration/docs pass (DB F-08, AppSec F-14/F-05/F-18/F-21, FE F-01)

**Files:**
- Modify: `scripts/create-admin.ts`, `supabase/config.toml`, `docs/community-setup.md`, `README.md` (one line)

- [ ] **Step 1: Failing test.** Extract the decision into `shouldPromote(existing: { id: string; isAdmin: boolean } | null, force: boolean): 'create' | 'update-admin' | 'refuse'` in `scripts/create-admin-logic.ts`, unit-tested: existing non-admin without `--force` → `'refuse'`.
- [ ] **Step 2: Run** `npx vitest run scripts` — FAIL (add `scripts/**` to `vitest.config.mts` include if needed).
- [ ] **Step 3: Implement** the script change (refuse, explain, paginate the user lookup fully). `config.toml`: `secure_password_change = true`, `otp_expiry = 1800`. `docs/community-setup.md`: a hosted checklist — Site URL, redirect URLs, custom SMTP and its hourly cap, Confirm email ON, leaked-password protection (HIBP), secure password change, OTP expiry, session timebox, and a "Not done by code" list (CAPTCHA, shared throttle store, admin MFA).
- [ ] **Step 4: Run** `npx supabase db reset && npx playwright test e2e/members.spec.ts` (reset flow still passes with `secure_password_change`) — PASS.
- [ ] **Step 5: Commit** `chore(auth): refuse to promote existing accounts to admin; document hosted settings`.

---

## Deferred (not in this plan; need an owner decision or an external service)

CAPTCHA on sign-up/reset (Turnstile account); shared rate-limit store (Upstash/Redis); admin TOTP + `aal2` and `getUser()` in `getAdmin` (AppSec F-04/F-15); softer per-account lockout (AppSec F-06); before-user-created hook for terms/metadata on direct signups (AppSec F-03/F-17); write-ledger rate limits, upload budget, like limit, ban-evasion list, `published_at` pinning (DB F-06/F-07/F-11/F-12/F-17); storage cleanup on account deletion (DB F-09/F-10); re-authentication before account deletion (AppSec F-13); moving RLS helpers out of the exposed schema (DB F-13).

## Self-Review

- Spec coverage: every CONFIRMED finding is in a task or the Deferred list with its reason; refuted items (R1 race, R2 double register, R3 token survival, AppSec #8) get no task.
- Type consistency: `clientIpFrom`, `classifyAuthError`, `isRecentRecovery`, `shouldPromote`, `MemberFormState.values`, `ConfirmButton` are defined once and consumed by name later.
- Order: Tasks 2→3→4→5→6 all edit `app/members-actions.ts` and must run sequentially; 7, 8 are independent of 3–6 but touch different files; 9→10 are sequential migrations.
