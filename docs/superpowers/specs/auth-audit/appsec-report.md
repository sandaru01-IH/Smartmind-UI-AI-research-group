# AppSec audit: member and admin authentication (Smartmind, Next.js 16.4.3 + Supabase)

Scope: login (member and admin), registration, email confirmation, forgot/reset password, logout, account deletion, session cookies.
Method: read-only code review. Line numbers refer to the working tree on `master` (aaccf7b). Library behaviour was checked in `node_modules` where noted. Supabase `config.toml` line numbers are absolute file lines.
Labels: **CONFIRMED** means the code path was proven by reading the code or running a pure-function reproduction. **HYPOTHESIS** means it depends on deployment details or on hosted GoTrue behaviour that could not be checked offline.

## Verdicts on the CTO's suspicions

| # | Suspicion | Verdict | Finding |
|---|-----------|---------|---------|
| 1 | `safeMemberNext` allows a tab and becomes `//evil.com` | **CONFIRMED.** Exploitable on both the JS and no-JS paths | F-02 |
| 2 | The throttle is non-atomic and in-memory | **Partly confirmed.** Login can be raced. Register and forgot-password cannot be raced inside one instance, because check and fail run synchronously. Per-instance only: confirmed | F-04 |
| 3 | `clientKey()` falls back to `'unknown'` | **CONFIRMED in code.** Impact depends on the host. The bigger issue is the reverse: a forged XFF lets an attacker dodge the limit | F-10 |
| 4 | All Supabase per-IP limits are shared; `verifyOtp` is called 5 times; errors are reported as "expired" | **CONFIRMED.** This is the most serious availability issue | F-01 |
| 5 | `signOut()` defaults to global scope | **CONFIRMED** (auth-js `GoTrueClient.js:3417`). Four call sites | F-09 |
| 6 | Reset has no throttle, no recovery check, no current password, no revocation | **Confirmed except revocation.** Revocation is a hypothesis: GoTrue probably revokes other refresh tokens itself, but access JWTs stay valid for up to 1 hour | F-05, F-15 |
| 7 | The public anon key allows direct signup/recover | **CONFIRMED.** zod rules are partly kept by DB/GoTrue (display-name trigger, `minimum_password_length`). The throttle, terms acceptance and CAPTCHA are not | F-03, F-04, F-17 |
| 8 | `emailRedirectTo` uses the Origin header | **REFUTED as exploitable.** The templates build links from `{{ .SiteURL }}` and never use `RedirectTo`. Next's Server Action CSRF check already forces Origin to equal Host | F-16 |

## Severity tally

High 1, Medium 5, Low 9, Info 7.

---

## HIGH

### F-01: One anonymous attacker can lock out sign-in, sign-up, confirmation and password reset for the whole site
- **Severity:** High (availability). **Status:** CONFIRMED in code. How large the impact is depends on how many egress IPs the host has (HYPOTHESIS for Vercel).
- **Where:**
  - `app/members-actions.ts:71`, `:105`, `:139`, `:158`, `:203`, `:233`: every GoTrue call is made server-side through `createSessionClient()` (`lib/supabase/server-client.ts:12`). No client IP is forwarded.
  - `app/admin/actions.ts:90`.
  - `supabase/config.toml:208` `sign_in_sign_ups = 30` per 5 min per IP. `:210` `token_verifications = 30` per 5 min per IP. `:200` `email_sent`.
  - `app/members-actions.ts:196-207`: `verifyLinkToken` iterates `new Set(['recovery', type, 'signup','email','recovery','invite','magiclink'])`, which is up to 5 `verifyOtp` calls. An invalid or expired link costs 5. A valid confirmation link costs 2.
  - `:225-226`: any failure, including a 429, is shown as "link expired".
  - `:106-111` and `admin/actions.ts:91-94`: any sign-in error, including a 429, is shown as "email or password is not correct" and counts as a failure.
- **Scenario:** Supabase sees every visitor as the app server's IP, so they all share one bucket.
  1. The attacker posts the member login action about 30 times in 5 minutes, each time with a different email. `memberLoginThrottle` is keyed `ip|email` (`:96`), so it never trips.
  2. For the next 5 minutes, every real user's login and registration gets a GoTrue 429. The user sees "wrong password" (login) or "registration failed" (register).
  3. Each of those failed logins also increments that user's own `memberAccountThrottle` (`:108`). That compounds into F-06.
  4. Repeating step 1 keeps the outage going indefinitely.
  5. Separately, 6 POSTs of `/auth/confirm` with a junk `token_hash` (6 × 5 = 30 verifications) block every real confirmation and reset link for 5 minutes. Each victim is told their link "expired", so they request more emails and drain the email quota (F-03).
- **Fix (minimal):**
  - Server-side calls that act for a visitor must send the visitor's IP to GoTrue. Self-hosted GoTrue supports `X-Forwarded-For` when `GOTRUE_RATE_LIMIT_HEADER` is set. On hosted Supabase, enable CAPTCHA (Turnstile/hCaptcha) and pass `captchaToken`, or move the per-IP limit into the app using a shared store.
  - Call `verifyOtp` once, with the link's own `type`. Templates are under your control (`supabase/templates/*.html:78/87`). Accept only `type ∈ {email, recovery}`.
  - Map `error.status === 429` / `code === 'over_request_rate_limit'` to a "try again shortly" message. Do not count it as a credential failure.

---

## MEDIUM

### F-02: Open redirect after member login via a tab character in `next`
- **Severity:** Medium. **Status:** CONFIRMED (reproduced with `node` against a copy of the function; header acceptance verified with `http.ServerResponse`).
- **Where:**
  - `lib/members/schema.ts:24-31`: only `//`, `\` and `..` are rejected.
  - `app/(site)/login/page.tsx:29` puts the value into a hidden input (`components/members/member-forms.tsx:118`).
  - `app/members-actions.ts:115` `redirect(safeMemberNext(...))`.
- **Proof:**
  - `safeMemberNext("/\t/evil.com")` returns `"/\t/evil.com"`, and `new URL(that, "https://site/login").href` is `https://evil.com/`.
  - Node accepts a tab in header values. LF and CR throw `ERR_INVALID_CHAR`, so tab is the working character.
  - JS path: Next sets `x-action-redirect: /\t/evil.com;push` (`node_modules/next/dist/server/app-render/action-handler.js:267`). The client resolves it with `new URL(location, href)` (`client/assign-location.js:20`), gets an external URL, and does a hard navigation (`server-action-reducer.js:243-248`).
  - No-JS path: `Location: /\t/evil.com` (`action-handler.js:874`). The browser strips the tab.
- **Scenario:**
  1. The attacker sends `https://<site>/login?next=/%09/evil.com/login`.
  2. The victim logs in on the real site and lands on the attacker's clone page ("session expired, log in again").
  3. The clone harvests the credentials.
- **Fix:** In `safeMemberNext`, reject any character outside the printable ASCII range, `/[\u0000-\u001F\u007F]/`, before the other checks. Better: parse with `new URL(value, 'http://x')` and require `u.origin === 'http://x'`, then return `u.pathname + u.search + u.hash`. Add test cases for `\t`, `\n`, `\r`, and `/%5C`. `safeNext` (admin) is not affected, because of the `/^\/admin[/?#]/` anchor in `lib/auth/safe-next.ts:7`.

### F-03: Direct Supabase API use (public anon key) bypasses every app-side control on signup, recover and password grant; the shared email quota can be exhausted
- **Severity:** Medium. **Status:** CONFIRMED (config). Hosted email quota numbers are a HYPOTHESIS: they depend on the dashboard and SMTP setup.
- **Where:**
  - `lib/supabase/env.ts:3-4`: the anon key is `NEXT_PUBLIC_*`.
  - `supabase/config.toml:177`, `:222` `enable_signup = true`.
  - `:214-218`: CAPTCHA is commented out.
  - `:200` `email_sent = 100`/h for the whole project. Hosted projects on the built-in SMTP get only a few per hour.
  - `:231` `max_frequency = "1s"`.
- **Scenario:**
  1. `POST {SUPABASE_URL}/auth/v1/signup` and `/auth/v1/recover` with the anon key skip `registerThrottle` and `resetThrottle`, terms acceptance (`registerSchema.acceptTerms`, never stored server-side anyway) and zod.
  2. A short loop over random addresses uses up the project-wide email quota. After that, no real user can get a confirmation or reset email until the hour rolls over.
  3. The same flood also creates junk `auth.users` and `member_profiles` rows, because the `handle_new_member` trigger runs on insert (`supabase/migrations/20261030000200_community.sql:21-35`).
  4. While the quota is exhausted, `registerAction` turns into an enumeration oracle (F-12).
- **Fix:**
  - Enable `[auth.captcha]` (Turnstile) and pass `options.captchaToken` from the register and forgot forms.
  - Configure custom SMTP with a sane per-hour budget.
  - Optionally add a `before_user_created` hook (`config.toml:288-291`) that rejects disposable domains, enforces a burst limit, or requires a signed "came through the site" claim.

### F-04: Password brute-force protection is mostly cosmetic: it can be raced, is per-instance, and is bypassed via the direct API; no MFA on admin
- **Severity:** Medium. **Status:** CONFIRMED.
- **Where:**
  - `lib/auth/throttle.ts:24`: in-memory `Map` per instance.
  - `app/members-actions.ts:97-108` and `app/admin/actions.ts:79-93`: `check()` runs, then `await signInWithPassword`, then `fail()`. Concurrent requests all pass the check before any failure is recorded.
  - The register path (`members-actions.ts:65-67`) and the forgot path (`:133-135`) run check and fail synchronously with no `await` between them, so they are NOT raceable inside one instance. This part of suspicion #2 is refuted.
  - Separate budgets: admin accounts can also sign in through `/login`, which uses `memberLoginThrottle`/`memberAccountThrottle` (20/h). That runs alongside the admin `accountThrottle` (20/h), so the per-account budget per instance is effectively doubled.
  - `supabase/config.toml:186` `password_requirements = ""`. `:312-314`: TOTP MFA is disabled.
  - `scripts/create-admin.ts:16` accepts any 12-character `ADMIN_PASSWORD`.
- **Scenario:**
  1. The attacker fires 200 parallel login POSTs for the admin email, spread across several serverless instances and rotating XFF on non-Vercel hosts (F-10). The in-app limit does not stop them.
  2. Alternatively, the attacker goes straight to `/auth/v1/token?grant_type=password`, where only GoTrue's per-IP limit (30/5 min/IP) applies. Distributed IPs remove even that.
  3. A guessed admin password gives full CMS control.
- **Fix:**
  - Move the throttle to a shared atomic store (Upstash/Redis `INCR` + `EXPIRE`, or a Postgres table updated through a `security definer` function). Count the attempt before the GoTrue call ("reserve, then refund on success").
  - Enable TOTP MFA and require `aal2` in `getAdmin()` (`lib/auth/require-admin.ts:20-24`, check `claims.aal === 'aal2'`).
  - Set `password_requirements` and turn on leaked-password protection (HIBP) in the dashboard.
  - Use CAPTCHA on login after N failures.

### F-05: The password change needs only a live session: no re-authentication, no recovery-session check, no throttle; combined with a weak CSP this turns any session hijack or XSS into a permanent takeover
- **Severity:** Medium. **Status:** CONFIRMED for the code and config. Session revocation is a HYPOTHESIS; see F-15.
- **Where:**
  - `app/members-actions.ts:146-161`: only `getUser()` must succeed. There is no check of `amr`/`recovery` and no current password.
  - `supabase/config.toml:229` `secure_password_change = false`.
  - `next.config.ts:25` `script-src 'self' 'unsafe-inline'`: inline-script XSS is not mitigated by the CSP.
  - `/reset-password` is reachable by any signed-in member (`app/(site)/reset-password/page.tsx`). It is the only password-change UI.
- **Scenario:**
  1. Any XSS on the origin (for example, in member-authored blog content) runs same-origin JS. The cookies are `httpOnly` (`server-client.ts:20`), so the script cannot read them.
  2. It doesn't need to. It reads the `resetPasswordAction` action ID from the page's JS chunks and POSTs `Next-Action: <id>` with a new password.
  3. Next's Origin check passes because the request is same-origin.
  4. The victim's password is now the attacker's.
  5. The same applies to a stolen or borrowed laptop session, or a recovery session left open on a shared machine.
- **Fix:**
  - Set `secure_password_change = true` (GoTrue then requires a recent login, or a nonce from `supabase.auth.reauthenticate()`).
  - In `resetPasswordAction`, accept the change only if the session's `amr` contains `recovery` within the last ~10 minutes. Otherwise require the current password: `signInWithPassword` first, or the reauthenticate nonce.
  - Add a per-user throttle.
  - After success, call `supabase.auth.signOut({ scope: 'others' })`.
  - Send a "password changed" notification (`config.toml:261-265`, currently commented out).

### F-06: Targeted account lockout of any member or the admin with 20 requests per 15 minutes, from any IP
- **Severity:** Medium. **Status:** CONFIRMED.
- **Where:**
  - `lib/auth/throttle.ts:70-74` `accountThrottle` and `:91-95` `memberAccountThrottle`, keyed on the email only.
  - The check is enforced before the password is checked (`app/admin/actions.ts:79-85`, `app/members-actions.ts:97-101`), so the correct password is also refused.
  - F-01 adds to this: GoTrue 429s are counted as failures (`members-actions.ts:106-108`).
- **Scenario:**
  1. The attacker sends 20 wrong passwords for `admin@…` to `/admin/login`.
  2. The admin is locked out for 15 minutes. A cron job repeating step 1 every 15 minutes keeps them out permanently, on every warm instance it reaches.
  3. The same works against any member.
- **Fix:** Key the account limiter on `email + device cookie` or on `email + /24 network`, and make it a soft limit (CAPTCHA/step-up) rather than a hard lock. Never lock out a request whose password is correct. Alternatively, let a correct password plus a CAPTCHA through.

---

## LOW

### F-07: Login CSRF / session swap through an attacker's own recovery link
- **Severity:** Low. **Status:** CONFIRMED (code path). It needs one click by the victim on the real site.
- **Where:**
  - `app/(site)/auth/confirm/page.tsx:28-46` renders any `token_hash`.
  - `app/members-actions.ts:216-227` verifies it and, for `recovery`, keeps the session and redirects to `/reset-password` (`:227`).
- **Scenario:**
  1. The attacker requests a reset for their own account and copies the `token_hash` from the email.
  2. They send the victim `https://<site>/auth/confirm?token_hash=…&type=recovery`.
  3. The victim presses "Reset password" and is now signed in as the attacker.
  4. Anything the victim then writes or uploads (posts, profile photo, comments) lands in the attacker's account, which the attacker can re-enter by resetting again.
- **Fix:** Bind the reset to the browser that asked for it. Use the PKCE `code` flow (already half-implemented at `:232-236`; the verifier cookie is set by `resetPasswordForEmail`) and change the recovery template to `{{ .ConfirmationURL }}`-style PKCE, or set a short-lived signed "reset requested" cookie in `forgotPasswordAction` and require it in `confirmLinkAction`. Also show the account email on `/reset-password`.

### F-08: Throttle memory and CPU exhaustion
- **Severity:** Low. **Status:** CONFIRMED.
- **Where:** `lib/auth/throttle.ts:40-51`. Eviction only removes records with `failures.length === 0` that are unlocked. A record with even one recent failure is never removed, and a stale failure is only pruned when the same key fails again. Once `size > 5000`, every `fail()` does a full O(n) scan.
- **Scenario:** Varying the email in member login (`key = ip|email`, `members-actions.ts:96`) adds two permanent records per request in `memberLoginThrottle` and `memberAccountThrottle`. This happens even when GoTrue answers 429, which still counts as a failure. Memory grows without bound, and each request pays a growing linear scan. The attacker never needs a valid credential.
- **Fix:** Prune by time during eviction: delete when `lockedUntil < t` and every failure is older than `windowMs`. Hard-cap the map size (LRU). This becomes moot with a shared store (F-04).

### F-09: `signOut()` uses global scope in four places, including for the wrong user type at admin login
- **Severity:** Low. **Status:** CONFIRMED (`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:3417` defaults to `{ scope: 'global' }`).
- **Where:**
  - `app/members-actions.ts:120` member logout logs out every device.
  - `:229` confirm-email.
  - `app/admin/actions.ts:102`: a member who enters correct credentials on `/admin/login` has all their sessions revoked.
  - `:115` admin logout.
  - By contrast, `:183` (account deletion) uses `local`.
- **Scenario:** A member tries `/admin/login` once and is silently logged out on their phone and laptop. A user who presses "Log out" on a shared PC also kills their other devices. This is usually unwanted UX, and it hides the absence of a real "log out other devices" control.
- **Fix:** Use `signOut({ scope: 'local' })` for logout, admin-login rejection and the confirm step. Offer an explicit "sign out everywhere" button that uses `global`, and call `scope: 'others'` after a password change (F-05).

### F-10: Rate-limit key trusts the client-supplied `X-Forwarded-For`; when no header is present, everyone shares the `'unknown'` key
- **Severity:** Low (depends on the host). **Status:** CONFIRMED in code. HYPOTHESIS for how a given host treats the header.
- **Where:** `app/members-actions.ts:35` and `app/admin/actions.ts:76` take the first XFF entry, then `x-real-ip`, then `'unknown'`.
- **Scenario:**
  - (a) On a proxy that appends rather than replaces XFF (nginx `$proxy_add_x_forwarded_for`, many PaaS), the attacker sets `X-Forwarded-For: <random>` on each request. Every per-IP limit (`registerThrottle`, `resetThrottle`, `memberLoginThrottle`, `loginThrottle`) becomes per-request.
  - (b) With no proxy headers (`next start` exposed directly), every visitor is `'unknown'`. Five registrations or five reset requests per hour per instance then lock those features for everyone.
  - On Vercel, the platform overwrites XFF, so (a) does not apply. There, (b) applies only to direct origin access.
- **Fix:** Derive the IP from a trusted, deployment-specific source (`request.ip` equivalent / `x-vercel-forwarded-for` on Vercel, or the right-most untrusted hop for a known number of proxies). When the IP is unknown, fail closed per email or session rather than into one global bucket.

### F-11: GoTrue errors are mapped to misleading messages, which hides attacks and harms users
- **Severity:** Low. **Status:** CONFIRMED.
- **Where:**
  - `app/members-actions.ts:106-111`: every sign-in error, including 429 and 5xx, becomes "loginFailed" and increments the lockout counters.
  - `:79-81`: every signup error other than "already registered" becomes a generic failure.
  - `:139-141`: `resetPasswordForEmail` errors are ignored completely, and "done" is shown even when no email was sent because of the quota.
  - `:225-226`: every `verifyOtp` error becomes "expired".
- **Scenario:** During F-01 or F-03, users are told their password is wrong or their link expired. They retry, which deepens the lockout and the email drain. Operators get no signal.
- **Fix:** Branch on `error.status`/`error.code`. Show "busy, try again shortly" for 429, a neutral message for 5xx, and log a structured server-side event (no PII, no tokens) so alerting can catch floods.

### F-12: User enumeration through side channels
- **Severity:** Low. **Status:** The responses were checked by reading the code. The timing and quota behaviour is a HYPOTHESIS about GoTrue.
- **Where:**
  - `registerAction` (`:71-82`): for an already-confirmed email, GoTrue returns an obfuscated user and sends no email. For a new email, it sends one.
    - Timing: an existing email answers faster, because no SMTP round trip is needed.
    - Quota oracle: once the email quota is exhausted (F-03), a new email returns a 429, which shows as "registerFailed", while an existing email still returns `done`. That is a reliable oracle.
  - `forgotPasswordAction` (`:139`): the same timing difference (email sent vs not).
  - `memberLoginAction`: GoTrue skips the bcrypt comparison for unknown emails, so there is a timing difference.
  - The UI text itself does not leak (`:79`, `:110` comment is correct; "not confirmed" is only shown after a correct password).
- **Fix:** Send the GoTrue call without waiting for it (`after()` in Next 16) and return a constant-time response. Handle 429 identically for both branches. CAPTCHA (F-03) raises the cost.

### F-13: Account deletion has no re-authentication, and admins lose their photo before deletion is refused
- **Severity:** Low. **Status:** CONFIRMED.
- **Where:**
  - `app/members-actions.ts:167-185`: the only safeguard is typing `DELETE`.
  - `:174-176` removes the storage file before `rpc('delete_my_account')`. The RPC refuses admins (`supabase/migrations/20261030000400_delete_account_keeps_blocks.sql:10`), so an admin who runs the action still loses their profile photo, and the action returns `deleteFailed`.
  - The RPC itself is sound: it checks `auth.uid()` and admin status, preserves blocks, and is granted only to `authenticated`.
- **Scenario:** A hijacked or borrowed session (or the XSS from F-05) deletes the account irreversibly with one POST.
- **Fix:** Require the current password (or a `reauthenticate()` nonce) in the form. Call the RPC first and remove the photo only on success. Short-circuit admins in the action before touching storage.

### F-14: `create-admin` promotes whichever account already holds the email and prints the password to stdout
- **Severity:** Low. **Status:** CONFIRMED.
- **Where:**
  - `scripts/create-admin.ts:35-39`: an existing user (for example, someone who self-registered that address, even unconfirmed) is promoted. It gets `email_confirm: true` and `role = 'admin'` (`:50`), but its sessions, `user_metadata` and identities are kept.
  - `:24-31`: the lookup only scans 4000 users.
  - `:54`: the generated password is printed.
- **Scenario:**
  1. Before the operator runs the script, a member account using the target email has an active session somewhere: an old member account of the same person, or a squatted address the attacker managed to confirm.
  2. The moment the operator promotes it, that session is an admin session. The password reset does not revoke existing sessions, because the admin API does not log them out.
- **Fix:** Refuse to promote an existing non-admin account unless `--force` is given. When promoting, call `auth.admin.signOut(userId, 'global')` (or delete the user's sessions). Paginate fully, or use the email filter. Do not print passwords in CI contexts; write them to a 0600 file instead.

### F-15: Revocation is not immediate for admin: access JWTs stay valid after logout or password change
- **Severity:** Low. **Status:** CONFIRMED that `getClaims` is local. GoTrue's handling of other sessions on password change is a HYPOTHESIS.
- **Where:**
  - `proxy.ts:79` and `lib/auth/require-admin.ts:20` use `getClaims()`, which verifies the signature locally when the project uses asymmetric keys and never consults the session table. PostgREST RLS also trusts the JWT.
  - `supabase/config.toml:166` `jwt_expiry = 3600`.
  - Member pages use `getUser()` (`lib/members/session.ts:25`), which does hit GoTrue.
- **Scenario:** A stolen admin access token keeps working against `/admin` and the DB for up to 1 hour after the admin logs out or changes their password.
- **Fix:** In `getAdmin()`, use `getUser()` or check `session_id` against `auth.sessions` through a `security definer` RPC. Lower `jwt_expiry` to around 600 seconds. Enable `[auth.sessions] timebox` / `inactivity_timeout` (`config.toml:282-286`).

---

## INFO

### F-16: `emailRedirectTo`/`redirectTo` taken from the Origin header (CTO #8): REFUTED as exploitable
- `app/members-actions.ts:37`, `:75`, `:140`.
- The templates use `{{ .SiteURL }}` (`supabase/templates/confirmation.html:78,98`, `recovery.html:87,111`), not `{{ .RedirectTo }}`, so the value is never put in the email.
- Next's Server Action CSRF check rejects a cross-origin `Origin` (no `serverActions.allowedOrigins` in `next.config.ts`), and GoTrue validates against `additional_redirect_urls` (`config.toml:164`).
- Recommended clean-up: use `SITE_URL` unconditionally, so a future template change to `RedirectTo` cannot reopen the issue.

### F-17: Terms acceptance is never recorded
- `acceptTerms` is validated (`lib/members/schema.ts:10`) but not stored (`app/members-actions.ts:76` only sends `display_name`), and direct API signups skip it.
- Fix: store `terms_accepted_at`/version in `member_profiles` via the `before_user_created` hook, or a first-login gate.

### F-18: Tokens in the URL query string
- `/auth/confirm?token_hash=…` is logged by any access log and CDN log and stays in browser history. `otp_expiry = 3600` (`config.toml:235`).
- `Referrer-Policy: strict-origin-when-cross-origin` (`next.config.ts:40`) prevents cross-site leakage. The proxy sets `private, no-store` on `/auth/*` (`proxy.ts:85-86`).
- Fix: shorten `otp_expiry` to 15–30 minutes and scrub query strings from logs.

### F-19: Dead or half-wired PKCE `code` branch
- `app/members-actions.ts:232-236` and `confirm/page.tsx:30-32`. No template emits `code`.
- Because `@supabase/ssr` defaults to `flowType: "pkce"` (`node_modules/@supabase/ssr/dist/main/createServerClient.js:37`), every signup or reset also leaves an unused `*-code-verifier` cookie.
- Either adopt this branch for F-07 or remove it.

### F-20: Proxy matcher and Cache-Control coverage
- All auth pages are matched (`proxy.ts:110-124`). `/account/:path*` also matches `/account`. They get `private, no-store`.
- Gaps (not vulnerabilities):
  - `/blog/:slug` and `/news/:slug` return early at `proxy.ts:51`, so comment and like actions posted there get no proxy refresh. The actions refresh tokens themselves.
  - Other routes get no session refresh.
  - `X-Robots-Tag` is only set on `/admin`. The member auth pages rely on meta `robots`.
- HYPOTHESIS: with `cacheComponents`, Next may override the proxy's `Cache-Control` on prerendered shells (`/login`, `/register`, `/reset-password` have no dynamic APIs at page level). Verify with `curl -I` in production.

### F-21: Session lifetime and cookie flags
- Cookies are forced to `httpOnly`, `SameSite=Lax`, and `Secure` in production (`proxy.ts:66-73`, `lib/supabase/server-client.ts:18-23`). Good.
- There is no `__Host-` prefix, and `@supabase/ssr` defaults to roughly 400-day persistent cookies.
- `[auth.sessions]` timebox and inactivity timeout are disabled (`config.toml:282-286`). `refresh_token_reuse_interval = 10` (`:175`) is fine.
- Fix: set `timebox` (e.g. 30 days for members, 12 hours for admin via `aal2` + inactivity).

### F-22: Admin and member share one identity and every member auth flow
- An admin can sign in at `/login` and reset through `/forgot-password`. A recovery link for the admin email yields a full admin session without the password (`app/members-actions.ts:227` → `/reset-password`; `/admin` then admits via `getAdmin`).
- So admin security is the admin mailbox's security, with no MFA (F-04).
- Role separation itself is correct:
  - `getAdmin` checks `profiles.role` server-side.
  - `profiles` has no client writes (`supabase/migrations/20261014000000_init.sql:91-92`).
  - `user_metadata` is never used for authorisation; only `display_name` is read, and the trigger trims it to 80 characters.
  - `safeMemberNext` keeps members out of `/admin` redirects.
- Fix: MFA (`aal2`) for admin. Optionally refuse member-flow recovery for admin accounts.

---

## Checked and found sound
- **CSRF:** every auth mutation is a Server Action and protected by Next's Origin/Host check. There are no GET-based mutations. `form-action 'self'` and `frame-ancestors 'none'` are set (`next.config.ts:32-33`).
- **Error leakage:** the UI shows generic strings everywhere. No `console.*` calls in the auth code; no tokens or passwords are logged (except the create-admin stdout in F-14).
- **Registration and login responses:** the response bodies do not enumerate users (`members-actions.ts:79`, `:110`).
- **`/api/me` and `/api/blog/viewer`:** both send `private, no-store` and return only the caller's own data.
- **Admin `safeNext`:** robust against the tab trick because of the anchored regex.
