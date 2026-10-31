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

| Setting | Value |
| --- | --- |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Login | the SMTP login shown on that page (it is **not** your account email) |
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

## 4. Admin accounts

Admins are separate from members and are made on purpose:

```bash
npm run create-admin -- you@example.com
```

Registering on the site never makes anyone an admin.

## 5. Before you announce it

- **Read and approve the Terms and Privacy text.** It is a first draft in `content/legal.ts` and both pages show a "Draft" notice until you change it. It should be read by the team, and by someone who can advise on the law in Sri Lanka, before launch.
- Do the full test in section 3d.
- Walk through moderation once: **Admin → Community** has three tabs. **Posts** and **Comments** each have a Visible/Hidden switch. **Members** lists everyone with their email and a switch to block or allow them. Hiding or blocking removes the content from the public site within a minute and never deletes it. Writers see "Hidden by an admin" next to a hidden post in **My posts**. Admins cannot edit anyone's words.
- Add your first Medium articles under **Admin → Content → Medium articles**, and look at **Admin → Home page** to choose which home sections show.

## 6. Running it on your own computer

```bash
npx supabase start     # starts the local database; Docker must be running
npm run dev
```

Local emails are never sent anywhere. Open the test inbox at **http://127.0.0.1:54324** to read the confirmation and reset emails.

`npm run e2e` builds the site and runs the browser tests against the local database. Browser tests that register people need the local Supabase to be running.
