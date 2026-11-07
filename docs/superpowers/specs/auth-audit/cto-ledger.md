# CTO ledger: auth audit (Smartmind) - started 2026-11-01
Baseline: tsc clean, vitest 284/284 pass (lib). Local Supabase + dev server up (Mailpit on :54324). Test user audit.user1@example.test (local only).
Probes live in this scratchpad (probe-*.mjs / .mts).

## CONFIRMED by live reproduction (my own probes)
- C1 HIGH  Open redirect after login: safeMemberNext accepts "/<TAB>/evil.example" -> browser lands on http://evil.example/pwn after real login. (lib/members/schema.ts:24; also safeNext in lib/auth/safe-next.ts needs same hardening.) probe-redirect.mjs
- C2 MED   React 19 resets uncontrolled form after failed action: register wipes name/email/terms; login wipes email. probe-reset.mjs
- C3 MED   Register of already-CONFIRMED email: UI says "check your email", no email is ever sent. probe-register.mjs (case C)
- C4 LOW   Re-register of unconfirmed email silently resends (only "resend" path, undiscoverable). No resend UI. (case B)
- C5 MED   Direct POST /auth/v1/signup with public anon key bypasses throttle, terms, zod, display-name rules. probe-direct.mjs
- C6 MED   Email enumeration via direct signup: existing -> 422 user_already_exists, new -> 200. probe-direct.mjs
- C7 LOW   anon can list ALL member_profiles (id, display_name, created_at); admin's profile name auto-derived from email local-part. probe-direct.mjs
- C8 LOW   /api/me fetched 2x per page load (AccountMenu `watcher` sits at different tree positions per branch, remounts when answer arrives -> onChange -> refetch). Each = proxy getClaims + getUser + profile query. (components/members/account-menu.tsx)

## REFUTED / DOWNGRADED
- R1 throttle race: 24 parallel wrong passwords -> only 9 reached Supabase (limit 8+1). Check-then-fail gap NOT practically exploitable on one instance. Real weakness = per-instance memory (serverless) + 'unknown' IP bucket (still HYPOTHESIS, need code/host check).
- R2 double-click register: only 1 POST, 1 email. Fine.
- R3 wrong-type verifyOtp does NOT consume token (recovery/magiclink fail clean) - existing design comment is correct.

## OPEN HYPOTHESES (awaiting agent reports / hosted settings)
- H1 Supabase per-IP limits are shared by all visitors (all calls come from server IP); verifyLinkToken makes up to 5 calls per bad click and maps every error to "expired".
- H2 signOut() global scope on logout and after confirm.
- H3 resetPasswordAction: no throttle, no recovery-session check, other sessions not revoked.
- H4 clientKey 'unknown' bucket shared.
- H5 Hosted config unknown: SMTP, Confirm email, min password, redirect URLs, Site URL -> ask user for hosted project URL (read-only GET /auth/v1/settings) or dashboard screenshots.

## Agents (read-only reviewers, reports in this dir)
- appsec-report.md (opus) | db-rls-report.md (opus) | frontend-mail-report.md (sonnet)

## Fix plan: NOT STARTED. Needs worktree/branch (never on master); user has uncommitted site-header.tsx + untracked files on master.
