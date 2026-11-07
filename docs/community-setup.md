# Community blog: setting it up for the live site

This is for whoever runs the Smartmind site. It covers everything that has to be done **outside the code** before the community blog can go live: the database, sign-up settings and, most important, the email service. Menu names in the Supabase and Brevo dashboards move around from time to time, so if a name below does not match, look for the closest one.

What the new features are, in one minute:

- **Stories** menu in the top bar: Blog, Medium articles, Videos, News.
- **Blog:** anyone can register, then write, comment and like. Posts go live as soon as they are published. Admins can only hide things, never edit them.
- **Medium articles:** added by an admin under Admin → Content → Medium articles.
- **Videos:** pulled automatically from the YouTube channel.
- **Home page sections:** Admin → Home page switches "Our latest video", "Latest on Medium" and "Latest from the community" on or off. A section with nothing to show never appears.

## 1. Put the database changes on the live Supabase project

Five new files in `supabase/migrations/` create the tables and the security rules:

1. `20261030000000_medium_articles.sql`
2. `20261030000100_home_sections.sql`
3. `20261030000200_community.sql`
4. `20261030000300_admin_members.sql`
5. `20261030000400_delete_account_keeps_blocks.sql`

Run them **in that order**. Either way works:

- **From your computer** (the project is already linked): `npx supabase db push`. It asks for the database password and applies whatever is missing.
- **In the dashboard:** open **SQL Editor**, paste each file in turn and press **Run**.

Two security migrations come after those. **Do not run them on the live project blind**: they change existing rows (renames, clears photo references) and some posts or comments could look different afterwards. Follow [`docs/hosted-rollout.md`](hosted-rollout.md), which has the read-only checks to run first and the exact apply steps:

6. `20261101000000_member_hardening.sql` (member file paths and display names, hides unconfirmed and admin profiles, indexes)
7. `20261101000100_media_listing.sql` (stops anyone from listing every file in the `media` bucket; the public file links keep working)

If the live database was set up before `20261022000000_extra_partners.sql` and `20261023000000_collab_projects.sql` existed, run those two first. `supabase db push` does this for you.

> `hosted-clean-install.sql` rebuilds the **whole** database from nothing and **deletes all data and all logins**. Only use it on an empty or throw-away project.

## 2. Let people register (Supabase → Authentication)

1. **Sign-in methods → Email:** make sure **Enable email provider** and **Allow new users to sign up** are on, and turn **Confirm email** on. Confirming the address is what stops fake accounts from writing.
2. **URL configuration:**
   - **Site URL:** your public address, for example `https://smartmind.example`.
   - **Redirect URLs:** add `https://smartmind.example/auth/confirm` (use your real address).
3. **Email templates.** The site's emails open a page on the site that turns the link into a login. Edit the two templates so they use it:
   - **Confirm signup:** copy the HTML from `supabase/templates/confirmation.html`.
   - **Reset password:** copy the HTML from `supabase/templates/recovery.html`.

   Both build the link from `{{ .SiteURL }}` and `{{ .TokenHash }}`; leave those as they are, and keep the **Site URL** from step 2 correct.
   **Do not use Supabase's ready-made `{{ .ConfirmationURL }}` link in these emails.** It makes Supabase use up the one-time token before the site sees it, and the person then lands on the login page with "That link has expired or was already used", and a password reset never reaches the new-password form. If you restyle the emails, keep the two links exactly as they are in the files.

4. **Password rules:** set the minimum length to **12** (the site already asks for 12).
5. **Do not turn on CAPTCHA yet.** The site's forms do not send a CAPTCHA answer, so enabling it in Supabase would stop **all** registrations and logins. If spam becomes a problem later, ask for CAPTCHA support to be added first.

On your hosting service set `NEXT_PUBLIC_SITE_URL` to the same public address. The sitemap, page previews and emailed links use it.

## 3. Email with Brevo

Supabase's built-in email sender only allows a handful of emails an hour, which is not enough for real people registering. Brevo (formerly Sendinblue) has a free plan that is plenty for around ten writers. Check Brevo's pricing page for the current free daily limit.

### 3a. Create the account and a sender

1. Sign up at **brevo.com** and complete the short profile.
2. Go to **Senders, domains & dedicated IPs → Senders → Add a sender**. Use an address that belongs to the team (for example `no-reply@yourdomain` or the team's shared mailbox). Brevo emails a code to that address; enter it to verify.
3. **Strongly recommended: authenticate your own domain** (same screen, **Domains → Add a domain**). Brevo shows a few DNS records (DKIM and DMARC, sometimes a verification code) to add where your domain's DNS is managed. This is what keeps your emails out of spam folders.

   Free addresses such as `@gmail.com` as the sender can be refused or land in spam, because Gmail does not allow other services to send as it. If the team has no domain of its own, ask the university IT team whether you can use a university address and add the records, or ask Brevo support what they currently allow.

### 3b. Get the SMTP details

In Brevo open **SMTP & API → SMTP** (top-right menu → **SMTP & API**). You need:

| Setting  | Value                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Host     | `smtp-relay.brevo.com`                                                                                              |
| Port     | `587`                                                                                                               |
| Login    | the SMTP login shown on that page (it is **not** your account email)                                                |
| Password | press **Generate a new SMTP key**, give it a name such as "Smartmind site", and copy the key now (it is shown once) |

### 3c. Give them to Supabase

In Supabase go to **Authentication → Emails → SMTP Settings** (older dashboards: **Project Settings → Authentication → SMTP Settings**) and switch on **Enable custom SMTP**:

- **Sender email:** the verified sender from step 3a.
- **Sender name:** `Smartmind`.
- **Host / Port:** `smtp-relay.brevo.com` / `587`.
- **Username / Password:** the SMTP login and the SMTP key from step 3b.

Save, then raise the email limit: **Authentication → Rate Limits → Emails sent per hour**, for example to 100. (Supabase starts custom SMTP at a low limit.)

### 3d. Test it

1. Open the live site in a private window → **Log in** → **Register**, and register with an address you can read.
2. The confirmation email should arrive within a minute. If not, check the spam folder, then Brevo → **Transactional → Logs** for what happened.
3. Click the link. You should land on the login page with "Your email is confirmed".
4. Log in, press **Write**, publish a short test post, and check it on **Stories → Blog**.
5. Try **Forgot your password?** to test the reset email too.

## 4. YouTube videos that always show (optional but recommended)

The Videos page and the home page's "Our latest video" read the channel's newest videos from YouTube's public feed. YouTube sometimes answers that feed with an error ("404" or "500") for a few hours or days, and then the site has no videos to show. A free YouTube API key gives the site a reliable second source: it is only used when the feed fails.

1. Open **console.cloud.google.com**, sign in, and create a project (or pick one), for example "Smartmind site".
2. **APIs & Services → Library**, search for **YouTube Data API v3** and press **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**. Copy the key.
4. Open the key's settings and, under **API restrictions**, choose **Restrict key** and tick only **YouTube Data API v3**. (Do not use website or IP restrictions; the key is used from the server, not from visitors' browsers.)
5. On your hosting service add an environment variable **`YOUTUBE_API_KEY`** with that key, for Production. It must **not** start with `NEXT_PUBLIC_`, so it never reaches visitors. Then redeploy.

The free quota is far more than this site needs (it asks at most once an hour).

## 5. Admin accounts

Admins are separate from members and are made on purpose:

```bash
npm run create-admin -- you@example.com
```

Registering on the site never makes anyone an admin.

If that address already belongs to an ordinary member, the command stops and changes nothing, because promoting it would also replace that member's password. Add `--force` only if you really mean to take over that account: `npm run create-admin -- you@example.com --force`. Resetting the password of an account that is already an admin never needs `--force`.

## 6. Before you announce it

- **Read and approve the Terms and Privacy text.** It is a first draft in `content/legal.ts` and both pages show a "Draft" notice until you change it. It should be read by the team, and by someone who can advise on the law in Sri Lanka, before launch.
- Do the full test in section 3d.
- Walk through moderation once: **Admin → Community** has three tabs. **Posts** and **Comments** each have a Visible/Hidden switch. **Members** lists everyone with their email and a switch to block or allow them. Hiding or blocking removes the content from the public site within a minute and never deletes it. Writers see "Hidden by an admin" next to a hidden post in **My posts**. Admins cannot edit anyone's words.
- Add your first Medium articles under **Admin → Content → Medium articles**, and look at **Admin → Home page** to choose which home sections show.

## 7. Running it on your own computer

```bash
npx supabase start     # starts the local database; Docker must be running
npm run dev
```

Local emails are never sent anywhere. Open the test inbox at **http://127.0.0.1:54324** to read the confirmation and reset emails.

`npm run e2e` builds the site and runs the browser tests against the local database. Browser tests that register people need the local Supabase to be running.

## 8. Hardening checklist for the live project

`supabase/config.toml` only configures the **local** stack. The hosted project keeps its own copy of every setting below, so each one has to be checked in the dashboard once (names move around; look for the closest one). Tick them off after you have set them.

**Authentication → URL configuration / Sign-in methods**

- [ ] **Site URL** is the real public address, and **Redirect URLs** lists `https://your-address/auth/confirm`. A wrong Site URL breaks every emailed link.
- [ ] **Confirm email** is **on**.
- [ ] **Secure password change** is **on** (config.toml: `secure_password_change = true`). A session older than about 24 hours must then re-authenticate before the password can be changed.
- [ ] **Email OTP expiry** is **1800** seconds (30 minutes) or less (config.toml: `otp_expiry = 1800`). This is how long a confirmation or reset link stays valid.
- [ ] **Minimum password length** is **12**.
- [ ] **Leaked password protection** (checks new passwords against the HaveIBeenPwned list) is **on**. On Supabase this is a Pro-plan setting; if the plan does not include it, note that here and rely on the 12-character minimum.
- [ ] **Sessions:** set a **time-box** (for example 30 days) and, if the plan allows it, an **inactivity timeout** (for example 7 days), so a lost device does not stay signed in for ever. Both are commented out in `config.toml`; they are plan-dependent on the hosted project.

**Email**

- [ ] **Custom SMTP** is switched on (section 3) and **Emails sent per hour** is raised to match what Brevo allows. The site's resend button, the register form and "Forgot your password?" all send mail, so the hourly cap is also the ceiling for how many people can register in an hour.
- [ ] A real registration was tested end to end (section 3d), including the confirmation email, the resend button and the reset email.

**Database**

- [ ] Migrations `20261101000000` and `20261101000100` are applied (section 1).
- [ ] In **Storage → media → Policies** there is no policy called `media: public read`.

### Not done by code (needs an account, a service or a decision)

These are known gaps. The site works without them, but they are the next things to do if abuse shows up:

- **CAPTCHA** on register, forgot-password and resend. Needs a Cloudflare Turnstile (or hCaptcha) account, then support added to the forms; do **not** switch it on in Supabase before that (section 2, step 5).
- **A shared rate-limit store.** The site limits repeated attempts (per address and per e-mail) in the memory of each running server instance, so the limits reset when an instance restarts and are not shared between instances. Moving them to Upstash/Redis is the follow-up.
- **Admin two-factor sign-in (TOTP).** Admin sign-in is password only. Enabling it needs the admin pages to require the second factor as well.
- **A per-address cap on member sign-in.** Sign-in attempts are limited per address-and-email pair and per email, but one address that keeps changing the email it tries is not limited by the site (Supabase's own limit still applies, and that limit is shared by every visitor). Also missing: upload and like budgets and a blocked-address list.

### Known residual risk: account takeover with a stolen session

The site only lets someone change a password from the account page when they have proved control of the inbox in the last 15 minutes (or are using a reset link). Supabase's own sign-in service, however, also accepts `PUT /auth/v1/user` directly with a valid access token and the public key, and that route does not go through the site.

With **Secure password change** on (checked on the local stack, 2026-11-04):

- a session **older than about 24 hours** is refused with `reauthentication_needed`;
- a session **younger than that** can change the password with just its access token.

Supabase also signs out **every other session** whenever a password changes, and keeps the one that made the change (checked: the other session's refresh token stopped working, the changing session's kept working). So someone who steals a session in its first day (for example a copied browser cookie) can set a new password, lock the real owner out and stay signed in. The site's own sign-out of other devices adds nothing here; it protects nothing that Supabase does not already do.

What limits it: the thief needs a session less than a day old, and the owner can still use "Forgot your password?" to get back in (that needs their inbox, which the thief does not have). What would close it: a service-level switch to disable direct password changes, or asking for the current password on every change; neither is available as a plain Supabase setting today. For the admin account, add two-factor sign-in (see the list above).
