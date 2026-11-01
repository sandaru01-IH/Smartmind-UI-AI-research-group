# Frontend / mail-flow audit: register, confirm, login, forgot/reset, logout, header account menu

Scope: read-only code audit of E:\Work\Smartmmind (working tree, `site-header.tsx` has uncommitted edits). No server was started, so nothing here was observed at runtime.
Labels: **CONFIRMED** = follows directly from the code read (plus documented React/Next/GoTrue behaviour). **NEEDS-BROWSER-VERIFICATION** = depends on runtime ordering, hosted Supabase settings or GoTrue internals I could not exercise.
Line numbers refer to the working tree.

## Ranked summary

| ID | Sev | Status | One-liner |
|----|-----|--------|-----------|
| F-01 | High | CONFIRMED (code) + NEEDS-VERIFICATION (hosted) | Mail settings live outside the repo; if hosted templates were never synced, confirm/reset links take a different, broken path |
| F-02 | High | CONFIRMED | Mail errors are swallowed or mislabelled: forgot always says "on its way", register says "check the details" for SMTP/rate-limit failures |
| F-03 | High | CONFIRMED | No "resend confirmation" anywhere, yet two messages tell the user to "ask for a new link" |
| F-04 | High | CONFIRMED | React 19 form reset wipes name/email/password/terms after every failed submit |
| F-05 | High | NEEDS-BROWSER-VERIFICATION | Confirm button has no pending/disabled state; double-click spends the token then shows "expired" |
| F-06 | High | CONFIRMED (code), count needs Network-tab check | `/api/me` is fetched twice per page load, twice per mobile-menu open |
| F-07 | Medium | NEEDS-BROWSER-VERIFICATION | Logout race: header can flip back to "signed in" after log out |
| F-08 | Medium | CONFIRMED / NEEDS-VERIFICATION | Re-registering: confirmed address gets no email but UI says "check your inbox"; unconfirmed address silently invalidates the earlier link |
| F-09 | Medium | CONFIRMED | After password reset the user stays logged in but is shown a "Log in" button; other sessions are not revoked; direct visit to /reset-password dead-ends |
| F-10 | Medium | CONFIRMED | Confirmation deliberately signs the user out (global scope), forcing a login and dropping `next`; Logout is also global |
| F-11 | Medium | CONFIRMED | Throttles: 5 registrations/hour/IP (shared campus IP), 5 reset requests/hour/IP, in-memory, English-only hard-coded text; combined with F-03 this locks people out |
| F-12 | Medium | CONFIRMED | Form accessibility: no aria-invalid, email error not linked, "highlighted fields" are not highlighted, no focus management, done panel loses focus |
| F-13 | Low | CONFIRMED | Forgot and reset buttons say "Logging in" while pending |
| F-14 | Low | CONFIRMED | Stale or wrong messages (`?error=expired`, `?verified=1`, `code` treated as reset, confirmFailed text) |
| F-15 | Low | CONFIRMED | Header: API error shows "Log in" for a signed-in user; mobile account section pops in late; no desktop "Register" |
| F-16 | Low | CONFIRMED | Templates/config: no expiry stated, 1 h `otp_expiry`, hard-coded footer URL, `emailRedirectTo` is vestigial, 4-step confirm |
| F-17 | Low | NEEDS-VERIFICATION | Failed link verification makes up to 5 `verifyOtp` calls; token in URL without Referrer-Policy; pre-registration squat on unconfirmed address |
| F-18 | Info | CONFIRMED | Test coverage gaps |

Severity tally: High 6 / Medium 6 / Low 5 / Info 1.

---

## F-01 (High) Mail configuration is not in the repo; an unsynced hosted project produces "strange" mail behaviour

- Files: `supabase/config.toml` [auth.email.template.*] (about lines 33-37 of the auth block), `supabase/templates/confirmation.html:78,98`, `recovery.html:87,111`, `docs/community-setup.md` section 2 step 3 and section 3, `app/members-actions.ts:75` and `:140`, `app/(site)/auth/confirm/page.tsx:25-49`.
- Facts: `config.toml` only configures the **local** stack (or hosted if someone runs `supabase config push`). Hosted templates, SMTP, Site URL, `otp_expiry`, rate limits are dashboard settings copied by hand (docs step 3). `config.toml` has no `[auth.email.smtp]` block, so the repo cannot prove the hosted project uses Brevo.
- The templates build links from `{{ .SiteURL }}/auth/confirm?token_hash=...`. `emailRedirectTo` / `redirectTo` (members-actions.ts:75,140) are used only by Supabase's default `{{ .ConfirmationURL }}` template. So when the hosted dashboard still has the default templates:
  1. The link goes to `https://<proj>.supabase.co/auth/v1/verify`, which **consumes the token itself** (email now confirmed), then redirects to `${origin}/auth/confirm?code=...` (PKCE; `@supabase/ssr` defaults to PKCE) or `#access_token=` (hash, invisible to the server).
  2. With `?code=`, `confirm/page.tsx:32` sets `reset = Boolean(code)`, so a **sign-up** confirmation shows "Reset your password / Continue", then `confirmLinkAction` (members-actions.ts:232-235) runs `exchangeCodeForSession`, which needs the code-verifier cookie set in the registering browser. Opened in another browser/phone it fails with `/forgot-password?error=expired` ("That reset link has expired") for a **sign-up** link. In the same browser it succeeds and drops the new user on `/reset-password`, signed in, asked to choose a password they just chose.
  3. With a hash redirect the server sees no params, `page.tsx:31` redirects to `/login?error=confirm` ("expired or already used") although the address **was** confirmed.
- Also: `{{ .SiteURL }}` is a single value. If hosted Site URL is still `http://localhost:3000` (Supabase default), every email links to localhost; docs mention it but nothing in the app detects it.
- Status: CONFIRMED that the app's behaviour is as above for the `code` path; NEEDS-VERIFICATION of what the hosted project actually has.
- Fix: (a) check hosted: Authentication -> Emails -> templates, SMTP, Site URL; run `npx supabase config push` after adding `[auth.email.smtp]` (env-substituted) so they cannot drift. (b) In `confirm/page.tsx` do not assume `code` means reset; carry a `type` hint, and when `exchangeCodeForSession` fails for a non-recovery flow send to `/login?error=confirm`, not forgot-password. (c) Optionally add a tiny client `useEffect` that detects `location.hash` containing `access_token`/`error_code` and shows the right message.

## F-02 (High) Mail errors are swallowed or mislabelled

- `forgotPasswordAction` (members-actions.ts:139-142): the result of `resetPasswordForEmail` is not even read. SMTP failure, `over_email_send_rate_limit` (hosted: once per 60 s per user, plus the project-wide hourly cap), "email address not authorized" (hosted default SMTP only mails team members) all end in `{ done: true }` and the green "a reset link is on its way". The user waits for mail that was never sent. This is very likely a core part of "emails are received in a strange way".
- `registerAction` (:79-81): any error not matching `/already|registered/` becomes `registerFailed` = "Could not create the account. Check the details and try again." That regex is dead code: with Confirm email on, GoTrue returns no error for an existing address. Rate-limit (429), SMTP-not-authorized, `weak_password` (HIBP / length rules differing from the 12-char client rule) and 5xx "Error sending confirmation email" all look like a user typo. The user retries, which re-triggers the 60 s limit.
- Hosted default SMTP: documented as ~2 emails/hour for the whole project and only to authorised team addresses. With it, almost every real registration errors or is dropped. Docs section 3 covers Brevo, but the app gives no signal when it is not set up.
- Fix (minimal): switch on `error.code` / `error.status` (supabase-js `AuthApiError.code`):
  - `over_email_send_rate_limit` / 429 -> "Please wait a minute before asking for another email." (both actions; for forgot this is safe because it reveals nothing about the account).
  - `email_address_not_authorized`, `unexpected_failure`, status >= 500 -> log server-side (`console.error`) and return a distinct "We could not send the email right now. Try again later or contact the team." for both actions (a send failure is not account-enumerating).
  - `weak_password` -> field error on password.
  - Everything else generic. Keep "already registered" silent (anti-enumeration) but see F-08.
- Also log (server) every non-OK result so the owner can see why mail is missing.

## F-03 (High) No resend-confirmation path, but the UI promises one

- `content/strings.ts:66-67` `confirmFailed`: "...If not, ask for a new link." `strings.ts:64` `notConfirmed`: "Check your inbox for the link we sent." Neither page has a resend control; grep shows no `auth.resend` anywhere. Login (`member-forms.tsx:114-138`) and confirm failure land on forms with no way to ask.
- Realistic dead-ends: (1) confirmation email never arrives (spam, F-02, F-11); (2) link older than `otp_expiry` = 3600 s (config.toml, also the hosted default) is opened later than 1 h; (3) the user registered twice and opens the older email (new signUp on an unconfirmed address regenerates the token, so the older link is dead); (4) corporate scanner/prefetch is handled (good), but a user who opens the link twice sees "expired" (F-05/F-14).
- Only accidental workarounds exist: re-submit Register (re-sends, but UI wording does not say so and hits the 60 s limit, F-02) or use "Forgot password" (GoTrue recovery for an unconfirmed user may also confirm the address; NEEDS-VERIFICATION).
- Fix: add `resendConfirmationAction(email)` using `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`, same neutral answer ("If that address is waiting for confirmation, we sent a new link"), throttled with `registerThrottle`. Surface it: (a) on `notConfirmed` login error show a "Send the link again" button (email is already known in the form once F-04 is fixed); (b) on `/login?error=confirm` show an email field + "Send a new link" (a ResendForm in `login/page.tsx`'s notice); (c) in the register Done panel ("Didn't get it? Send again / Use a different address"). Consider raising `otp_expiry` to 86400 for confirmation.

## F-04 (High) Failed submits wipe what the user typed

- React 19 resets uncontrolled fields of a `<form action={fn}>` after the action settles (documented `requestFormReset` behaviour), including when the action returns an error state. All four auth forms are uncontrolled: `member-forms.tsx:63` (Register), `:117` (Login), `:147` (Forgot), `:176` (Reset). Server-side validation only (all `noValidate`; `required`/`minLength` are inert), so errors are common.
- Effects: Register with a 10-char password returns `fieldErrors.password` and "Fix the highlighted fields", while name, email, password **and the terms checkbox are cleared** (`:89-94` checkbox is uncontrolled). Login with wrong password clears the email as well (`next` survives because it is a prop-controlled hidden input, `:118`). Forgot with a typo clears the email. A throttle message ("Too many attempts") also wipes the form.
- Status: CONFIRMED by code + React semantics; worth a 30-second browser check (E2E never submits an invalid form).
- Fix in this codebase's idiom (state shape is `MemberFormState`, `members-actions.ts:26`): add `values?: Record<string, string>` to the state and echo non-secret fields on every non-done return:
  ```ts
  // registerAction failure branches
  return { error: ..., fieldErrors, values: { displayName, email, acceptTerms: 'on' } }
  ```
  then `defaultValue={state.values?.email}`, `defaultValue={state.values?.displayName}`, `defaultChecked={state.values?.acceptTerms === 'on'}`. React resets to the *new* default so the values survive; works without JS. Do not echo the password (it would travel in the RSC payload); clearing the password after an error is normal, but then also focus it (F-12). Same for login (email only), forgot (email). Alternative: `onSubmit={(e) => { e.preventDefault(); startTransition(() => action(new FormData(e.currentTarget))); }}` avoids the auto-reset but loses no-JS behaviour.

## F-05 (High, NEEDS-BROWSER-VERIFICATION) Confirm button: no pending state, double-click spends the token

- `app/(site)/auth/confirm/page.tsx:39-46` is a server-rendered `<form action={confirmLinkAction}>` with a plain submit button: no `useFormStatus`, no `disabled`. Double-click, Enter-then-click, a laggy phone double-tap all send two actions. Next queues server actions sequentially; the first redirect does not cancel the already-queued second.
- Request 1: `verifyOtp` consumes the single-use token (members-actions.ts:196-207) and redirects to `/login?verified=1` or `/reset-password`. Request 2: token is gone, `verifyLinkToken` tries up to 5 kinds and returns null, so:
  - sign-up: `redirect('/login?error=confirm')` replaces the success notice with "expired or already used" although the account **is** confirmed (the text then tells them to log in, which works, so the damage is confusion).
  - recovery: `redirect('/forgot-password?error=expired')` (:226) while request 1 already set a valid recovery session cookie; the user is told the link expired, sent to the request-a-link form, and never reaches `/reset-password`. That is the worst case.
- Also: while the action runs (up to 5 sequential Supabase round trips for a bad token) the button gives zero feedback.
- Fix: (1) make the button a small client component using `useFormStatus` (`disabled={pending}`, spinner + label like `Submit` in member-forms.tsx). (2) Make the action idempotent: at the top of `confirmLinkAction`, after a failed verify, check `supabase.auth.getUser()`; if the person now has a session and `type`/flow was recovery, redirect to `/reset-password` instead of forgot-password; for sign-up failure with an already-confirmed session-less user nothing can be inferred, so keep the kind message but show it as "If you already confirmed, log in" (it already does). (3) Optionally guard with a one-time hidden nonce.

## F-06 (High) `/api/me` is called twice per page load, twice per mobile-menu open

Reading `components/members/account-menu.tsx`, `components/layout/nav-link.tsx`, `site-header.tsx`:

- Mounting: `SiteHeader` always mounts `<AccountMenu />` (site-header.tsx:106) on every viewport (hiding is CSS: `hidden md:block`). `<MobileAccountLinks />` (:202) is mounted **only while the mobile menu is open** (`{open ? ... : null}`). So they are not "always both mounted"; the mobile one is per menu-open.
- Intended: `useMe` skips tick 0 and the Watcher's mount effect triggers the first fetch (account-menu.tsx:28-30, nav-link.tsx:52-58 `useEffect(..., [pathname])` fires on mount). One call per mount plus one per pathname change.
- Actual bug (double call): `AccountMenu` returns three structurally different trees and puts `{watcher}` at a different position in each: `<>{watcher}<div/></>` while `!me` (:79-85), `<div>{watcher}<Link/></div>` signed-out (:89-97), `<div ref>{watcher}...` signed-in (:102-112). When `me` goes `undefined` to a value, React unmounts the `RouteChange`/Suspense/Watcher and mounts a new one; the new Watcher's mount effect calls `onChange()` again, so tick 1 to 2, a **second** fetch. Same in `MobileAccountLinks`: `if (!me) return watcher` (:159) vs `<ul>{watcher}` (:164). Chain: fetch #1 resolves, `setMe`, remount, fetch #2, `setMe` (same branch, no more remounts).
- Per-view cost (signed in; each `/api/me` = proxy `getClaims()` (proxy.ts:79 in file, network call to Auth on HS256 projects, local with asymmetric keys) + `getMember` `getUser()` (network) + `member_profiles` select = 2-3 Supabase round trips; signed-out without cookies = 0 network, just a function invocation):
  | Event | /api/me calls (now) | Intended | After fix below |
  |---|---|---|---|
  | Full page load | 2 | 1 | 1 |
  | Client navigation (pathname change) | 1 | 1 | 0 (see option C) |
  | Open mobile menu | 2 | 1 | 0 |
  | Blog post page load (adds `/api/blog/viewer`, `engagement.tsx:50-60`, with its own proxy getClaims + getUser + profile + like query) | 3 | 2 | 1-2 |
  | Logout (see F-07) | up to +1 | 0 | 0 |
- Other issues here: `getMember` uses `React.cache` (session.ts:22) which only dedupes inside one request, so `/api/me` and `/api/blog/viewer` repeat the identical getUser+profile work. Pathname-only trigger means search-param navigations (`?page=2`) do not re-check, and login from another tab is never seen. In dev StrictMode doubles effects too.
- Minimal fix (any combination):
  - A. Stop the remount: render a single stable tree, e.g. `return <>{watcher}{content}</>` in all branches (move `{watcher}` to the top of both components), or move the watcher into a module-level `MeProvider`.
  - B. One provider: create `MeProvider` mounted once in `SiteHeader`, holding `me`, one `RouteChange` and one fetch; `AccountMenu` and `MobileAccountLinks` (and `ViewerProvider`) read context. Mobile menu then costs 0 calls and shows data instantly. `ViewerProvider` only needs to fetch `liked`; or extend `/api/blog/viewer` to return `name/photoUrl` and drop `/api/me` on post pages.
  - C. Replace "refetch on every pathname change" with "refetch after auth events": call `refresh()` from the context when `memberLogoutAction` submits (already `signOutLocally`) and when pathname becomes one of `/login`, `/register`, `/auth/confirm`, `/reset-password`, `/account*` leaves, or on `visibilitychange`. Or add a non-sensitive `member-hint` cookie (set/cleared in login/logout actions) and skip the fetch entirely when absent (signed-out visitors, the majority, then cost nothing).
  - D. In-flight dedupe: module-level `let inflight: Promise<Me> | null` shared by all callers.

## F-07 (Medium, NEEDS-BROWSER-VERIFICATION) Logout can show "signed in" afterwards

- `<form action={memberLogoutAction} onSubmit={signOutLocally}>` (account-menu.tsx:145, 183). `signOutLocally` sets `me = {signedIn:false}` synchronously; because of the branch swap in F-06 the Watcher remounts and fires `/api/me` **in parallel** with the server action (still carrying the session cookie). If `/api/me` wins the race it returns `signedIn:true` and `setMe` overwrites the optimistic state; the avatar menu reappears.
- It self-corrects only when the pathname changes. Logging out while on `/` (`redirect('/')`, members-actions.ts:121) does not change pathname, so no refetch: stale avatar until the next navigation, and "Write" then bounces to `/login`.
- If the action fails (network), the UI already claims signed-out.
- `signOut()` with no scope is **global** (members-actions.ts:120): it signs the member out of every device. Probably unexpected; `deleteMyAccountAction` uses `{scope:'local'}` (:183), so the author knows the option.
- Fix: set a `loggingOut` flag in context that suppresses fetches until the action resolves, and refetch once after it (or `router.refresh()` + provider refresh); use `signOut({ scope: 'local' })` unless "log out everywhere" is intended; fix F-06 A so no extra fetch starts.

## F-08 (Medium) Re-registration behaviour is misleading

- Confirmed address: GoTrue (confirmations on) returns a normal-looking user and **sends no email**; `registerAction` returns `done`; the UI says "Check your email... If that address can be registered, we have sent a link" (strings.ts:55-56). A forgetful returning user waits forever with no pointer to "Log in" or "Forgot password". (Anti-enumeration is intended, but the message can include both links for everyone: "Already have an account? Log in or reset your password.")
- Unconfirmed address: GoTrue re-sends and **rotates** the confirmation token; the earlier email's link now fails with "expired or already used" (F-03) even though it is minutes old. UI gives no hint. NEEDS-VERIFICATION against the pinned GoTrue version.
- Within the 60 s `max_frequency` (hosted) the second signUp errors 429, shown as "Could not create the account. Check the details" (F-02).
- Pre-registration squat (NEEDS-VERIFICATION): a signUp on an *unconfirmed* address may overwrite the stored password/metadata before the real owner confirms. Rely on confirmation; consider rejecting duplicates with `identities.length === 0` checks only if Supabase exposes it.
- Fix: improve `registerDone` copy (links to Login/Forgot, "didn't arrive? send again", "wrong address? start over" button that resets the state); show the typed address in the panel ("We sent a link to ada@..."), which also catches typos. `Done` should be given `tabIndex={-1}` and focused on mount (F-12).

## F-09 (Medium) End of password reset

- `resetPasswordAction` (:146-161) calls `updateUser`, returns `{done:true}`. The recovery session is a full session, so the member **is logged in**. The UI (member-forms.tsx:165-174) says "Your password is changed." and a primary button "Log in" to `/login`; the header meanwhile shows the avatar menu. `/login` does not redirect signed-in users, so they see an empty login form while signed in and may type credentials again.
- Other sessions/devices are not revoked, which defeats the purpose of a reset after a compromise (`updateUser` does not sign out other sessions by default). Fix: `await supabase.auth.signOut({ scope: 'others' })` after a successful update.
- Pick one ending: (a) `redirect('/')` or `/account` with a toast (user is already logged in), or (b) sign out fully and then show "Log in". Whichever, remove the contradiction. Also give `login/page.tsx` a `getMember()` check that redirects signed-in users to `next`.
- Dead-end: `/reset-password` (reset-password/page.tsx:15-21) does not check for a session. Anyone landing there (bookmark, expired session, back button after finishing) types a new password and only then gets "This reset link has expired. Ask for a new one." (strings.ts:83) with **no link** to `/forgot-password`. Fix: server-check `getMember()`/`getUser()` on the page and redirect to `/forgot-password?error=expired`, and add a link to the error text.
- Same-password or breached-password failures (`updateUser` error) collapse to "Could not change the password. Try again." (:159); use `error.code` (`same_password`, `weak_password`) for field-level text.
- No confirm-password field; show/hide partially compensates.

## F-10 (Medium) Confirmation forces a re-login and loses context

- `confirmLinkAction` (:228-230) verifies the token (which already created a session), then `signOut()` (global scope) and redirects to `/login?verified=1`. Comment says to hold "a fresh session", but the user just proved ownership of the mailbox and then must retype the password. Flow is: open email, click link, press a button on the site, log in = 4 steps, and a first-time user may have typed the password on a phone and now needs it again.
- `next` is not threaded: a visitor sent from `/write` to login to "Register" (footer link `/register` has no `next`) ends at `/` after confirming.
- For `type` other than signup (magiclink/email for existing users) the global signOut also kills their other sessions.
- Fix: keep the session and `redirect(safeMemberNext(next) || '/')` with `?verified=1` shown as a toast; at minimum use `signOut({scope:'local'})`. If product wants login-once, say so on the confirm page ("then log in").

## F-11 (Medium) Throttles hurt legitimate users, protect little

- `lib/auth/throttle.ts:162-188`: `registerThrottle` 5 attempts/hour/IP, **every attempt counts** (members-actions.ts:67), `resetThrottle` 5/hour/IP. IP is `x-forwarded-for` first hop (:35), shared by a whole campus/NAT (the docs mention a university team), so the 6th person in a lab gets "Too many attempts. Try again in 60 minutes."
- A user who never receives the email (F-02/F-03) and retries 5 times is locked for an hour with no other route. The lock message appears inside the form that is then wiped (F-04).
- State is in process memory: on serverless/multi-instance it neither blocks reliably nor survives deploys. XFF is client-controlled unless the host overwrites it.
- `wait()` (:41) is a hard-coded English template outside `t.members`; "1 minutes" is possible (`Math.ceil(seconds/60)` gives 1 -> "1 minutes"); no unit pluralisation.
- Fix: count only *successful sends* for reset/register (or raise to ~20/hour and key by email as well as IP), move the message into `strings.ts`, and rely on GoTrue's own limits (`[auth.rate_limit]`: `email_sent`, `sign_in_sign_ups`, per-user `max_frequency`) with proper error mapping (F-02). Replace the Map with a shared store if throttling is to be kept.

## F-12 (Medium) Accessibility of the forms

CONFIRMED by reading:
- `EmailField` (member-forms.tsx:31-46): no `aria-describedby`/`aria-invalid`; `<FieldError id="email-error">` is never referenced. `displayName` (:66-75) `aria-describedby="displayName-hint"` only, never the error, no `aria-invalid`. Terms checkbox (:89-94) has neither. Only `PasswordField` (auth-fields.tsx:53-54) does it right.
- `FieldError` (auth-fields.tsx:18-25) is a plain `<p>`; not announced. The summary "Fix the highlighted fields." (strings.ts:87) is announced by the assertive region, but `fieldClass` has no invalid styling at all, so nothing is highlighted. Only the first message of each field is shown.
- No focus management: after a failed submit the first invalid field (or the summary) is not focused. With F-04 the form is also cleared, and clicking the submit button disables it while pending so focus falls to `<body>` in several browsers.
- `FormMessage` (auth-fields.tsx:77-87): `aria-live="assertive"` wrapper plus `role="alert"` child announces twice in some screen readers; use one of them.
- Done panels (member-forms.tsx:48-55) replace the form, destroying the focused button; `role="status"` inserted together with its content is often not announced. Focus the panel heading (`tabIndex={-1}`, `useEffect`).
- `notice` blocks (`role="status"`, :120, :149) are server-rendered at load, so not announced either.
- Autocomplete: login email uses `autoComplete="email"`; password managers expect `username` (or `username email`) on the login form. Register email OK. Password show/hide button combines `aria-label` swap and `aria-pressed` (double semantics: "Hide password, pressed"); keep only a static label with `aria-pressed`, or only the label swap.
- `ProfileForm` disables Save silently when invalid (`disabled={pending || !valid}`), no explanation.
- Fix: thread `errors` + `ids` through `EmailField`/inputs (`aria-invalid`, `aria-describedby` = error id then hint id), add `border-danger` class when invalid, add a `useEffect` on `state` that focuses the first `[aria-invalid="true"]` or the message.

## F-13 (Low) Wrong pending labels

`member-forms.tsx:155` Forgot and `:183` Reset pass `busy={t.members.loginBusy}` ("Logging in") while sending a reset link or saving a password. Add `forgotBusy` ("Sending") and `resetBusy` ("Saving").

## F-14 (Low) Stale or wrong messages

- `/forgot-password?error=expired` (forgot-password/page.tsx:20-22) is used for **every** failed `exchangeCodeForSession` (members-actions.ts:234), including sign-up confirmations arriving by `?code=` (F-01), so a new user is told "That reset link has expired".
- `/login?verified=1` shows "Your email is confirmed" to anyone who types the URL, and survives refresh and browser back; trivial spoof, harmless but sticky. After a failed login the notice vanishes (`!state.error`) which is fine.
- `/login?error=confirm` text "ask for a new link" has no mechanism (F-03).
- `auth/confirm/page.tsx:36` title for reset reuses `forgotTitle` ("Reset your password"), whereas on this page the person has already asked; use `resetTitle` ("Choose a new password").
- `unavailable` is only returned when Supabase env is missing; network exceptions from supabase-js inside actions (thrown rather than returned) are not caught anywhere in `registerAction`/`memberLoginAction`/`forgotPasswordAction`, so a Supabase outage produces the generic Next error boundary instead of a form message. Wrap `signUp`/`signInWithPassword`/`resetPasswordForEmail` in try/catch -> `t.members.unavailable`.
- Login failure for a *schema* error (e.g. badly formed email) says "That email and password do not match." (:93); acceptable, but loses the typed email (F-04).

## F-15 (Low) Header account menu UX

- `useMe` maps any non-OK or network failure to `{signedIn:false}` (account-menu.tsx:32-34), so a transient 500 shows "Log in" to a signed-in user until the next navigation. Keep the previous value on error and retry once.
- Mobile menu: `if (!me) return watcher;` (:159) renders nothing until the fetch returns, so the account block pops in, and the first open after a page load can show no Log in/Register for a moment. With a shared provider (F-06 B) it is instant.
- Desktop header shows only "Log in" for visitors (account-menu.tsx:91-97); Register exists on mobile and on the login page only.
- `/api/me` returns `verified` but `Me` type ignores it; unconfirmed users cannot log in anyway, so it is dead data.
- `AccountMenu` reserves `h-11 w-16` only on `md+` while loading: fine; no layout shift on mobile because the control is hidden.

## F-16 (Low) Templates and config

- `config.toml`: `otp_expiry = 3600` (1 h) for sign-up confirmation is short for email that lands in spam; `max_frequency = "1s"` locally hides the 60 s hosted default, so local tests never meet the 429 path (F-02); local `email_sent = 100`.
- Both templates state no validity period and the sender/subject are only applied locally. `confirmation.html:78,98` uses `type=email`; GoTrue's real type for a sign-up is `signup`. Works only because `verifyLinkToken` brute-forces kinds; fine but fragile.
- Footer link in both templates is hard-coded `https://www.smartminduiai.com/` (lines 140 / 182); `SITE_URL` is env-driven. Domain mismatch with Site URL will look odd (and spammy).
- `emailRedirectTo` / `redirectTo` (members-actions.ts:75,140) and the `origin` header logic in `clientKey()` (:33-39) are vestigial under the token_hash templates; they only matter for the default template path (F-01). Keep them correct anyway, since they select the allow-listed URL in the fallback path.
- No templates for email change, magic link, invite, reauthentication, so those use Supabase defaults (not used by the UI today).
- Flow length: click email link -> site page -> press "Confirm my email" -> login page -> type password (the extra page is deliberate against scanners; worth a line in the email: "You will press a button on our site to finish").

## F-17 (Low, NEEDS-VERIFICATION) Misc security-ish

- Failed link verification runs `verifyOtp` up to 5 times sequentially (members-actions.ts:201-205); `[auth.rate_limit] token_verifications = 30` per hour/IP locally (hosted default is per 5 min), so a handful of bad presses from a shared IP can rate-limit everyone behind it.
- `/auth/confirm?token_hash=...` renders the token into hidden inputs and the URL stays in history. Add `Referrer-Policy: no-referrer` (the page loads external fonts/images? check) so the token cannot leak via Referer before it is spent.
- `registerAction` sets the PKCE code-verifier cookie on every sign-up/reset that is never used (token_hash flow); harmless.

## F-18 (Info) What `e2e/members.spec.ts` + `members-support.ts` cover

Covered: happy register -> confirm -> login -> menu -> logout; scanner opens link twice then the button works; second use of a link shows the "already confirmed" message; empty `/auth/confirm`; wrong password generic; unconfirmed login message; member cannot enter admin; reset with button; wrong `type` on reset link; reused reset link goes to forgot with notice; account deletion.
Not covered (every finding above is untested): invalid register (field errors + retained values), re-register with confirmed/unconfirmed address, double-click on confirm, resend (does not exist), rate-limit / throttle messages, logout race and header state after logout, `/api/me` call count (add a Playwright `page.on('request')` counter asserting <= 1 per navigation), mobile menu account links, state of the session after password reset, `/reset-password` without session, a11y (axe) on the forms, Mailpit absence/SMTP failure. Local Mailpit with `max_frequency=1s` also cannot reproduce hosted 60 s/hourly limits; set `max_frequency = "60s"` and a low `email_sent` in a test config to exercise F-02.

---

## Suggested fix order (smallest effort for most impact)

1. F-02 error mapping + server logging (30 min) and F-13 labels (5 min).
2. F-04 `values` echo + F-12 aria/focus (1-2 h, one shared helper in `auth-fields.tsx`).
3. F-05 client confirm button with `useFormStatus` and recovery-idempotence.
4. F-06 single `MeProvider` (also fixes F-07 race and F-15 mobile pop-in).
5. F-03 resend action + UI; F-08 copy changes.
6. F-09 / F-10 end-of-flow decisions (product call: stay logged in after confirm/reset).
7. Verify hosted dashboard against F-01 and `supabase config push`.
