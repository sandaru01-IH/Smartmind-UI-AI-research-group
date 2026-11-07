# Smartmind data layer / RLS audit (login + community)

Scope: `supabase/migrations/*.sql` (15 files, read in order), `hosted-clean-install.sql`, `hosted-add-community.sql`, `tests/rls/*.test.ts`, `scripts/create-admin.ts`, `scripts/_env.ts`, `scripts/copy-local-to-hosted.ts`, plus the app code that the DB trusts (`app/members-actions.ts`, `lib/members/session.ts`, `lib/upload-path.ts`, `lib/supabase/env.ts`) and `supabase/config.toml`.
Read-only review. No database was queried; anything that depends on live hosted settings or the Supabase-managed `storage`/`auth` schemas is marked HYPOTHESIS with the query that settles it.

## Headline

- **No path found for a member to become admin, write `public.profiles`, read `auth.users`/emails, or flip `hidden`/`blocked`/`like_count`/`author_id`.** Column grants + RLS on the community tables are tight, every UPDATE policy has a WITH CHECK, every callable SECURITY DEFINER function has `set search_path` and an explicit `revoke ... from public`.
- The real exposure is **abuse rather than escalation**: impersonation via unchecked `display_name`/`photo_path`/`cover_path`, anonymous enumeration (members directory, bucket listing), rate limits that can be churned, and account-deletion edge cases.
- **Hosted SQL drift: none in content.** Every migration section in both hosted files is byte-for-byte equal to the migration (whitespace-insensitive diff). Differences are only the preambles (see F-19).

Severity tally: Critical 0, High 0, Medium 8, Low 9, Info 6.

---

## Medium

### F-01 Medium, CONFIRMED: `photo_path` / `cover_path` accept any string; the app's path check is bypassed by talking to PostgREST directly
- Where: `20261030000200_community.sql:11` (`photo_path text`, no CHECK), `:70` (`cover_path text`, no CHECK), grants at `:176` and `:179-182`. App-only validation in `lib/upload-path.ts:21` / `app/blog-actions.ts:69`. Rendered by `lib/supabase/env.ts:13` (`mediaUrl`), which keeps `..` segments (`encodeURIComponent('..') === '..'`).
- Impact: any member (even with an **unconfirmed** email, because "member_profiles: update own" at `:204` has no `is_verified_member()`) can set their avatar to the official Smartmind logo, a team member's photo or an admin's unpublished cover. Verified members can do the same with blog covers. A `../` path makes the browser fetch any GET URL on the Supabase host (other public buckets, `/storage/v1/object/public/<other-bucket>/...`).
- Demo:
  ```http
  PATCH /rest/v1/member_profiles?id=eq.<my-uid>
  apikey: <anon>   Authorization: Bearer <member JWT>   Content-Type: application/json
  {"photo_path":"covers/2026/<admin-file>.webp","display_name":"Smartmind Team"}
  ```
  ```http
  PATCH /rest/v1/blog_posts?id=eq.<my-post>
  {"cover_path":"../../../../storage/v1/object/public/media/team/<person>.jpg","cover_alt":"x"}
  ```
- Fix (enforce in the database what `isValidMemberUploadPath` enforces in the app):
  ```sql
  -- 20261101000000_member_paths.sql
  alter table public.member_profiles add constraint member_photo_own_folder check (
    photo_path is null or photo_path ~ ('^members/' || id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));
  -- blog_posts: author_id may be null after deletion, so check on write instead of as a constraint
  create or replace function public.blog_cover_own_folder() returns trigger
  language plpgsql set search_path = public as $$
  begin
    if new.cover_path is not null and (new.author_id is null or
       new.cover_path !~ ('^members/' || new.author_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')) then
      raise exception 'Invalid cover path' using errcode = '23514';
    end if;
    return new;
  end $$;
  create trigger blog_posts_cover_path before insert or update of cover_path on public.blog_posts
    for each row execute function public.blog_cover_own_folder();
  revoke all on function public.blog_cover_own_folder() from public, anon, authenticated;
  ```
  (Clean up existing bad rows before adding the constraint, or add it `not valid` and then `validate constraint`.)

### F-02 Medium, CONFIRMED: `display_name` only checks length; impersonation and invisible names, settable without email confirmation
- Where: `20261030000200_community.sql:9` (CHECK 2..80 only), `handle_new_member` `:21-31` (`btrim` strips spaces only), update grant `:176`, policy `:204-205` (no `is_verified_member()`).
- Impact: `raw_user_meta_data` is fully attacker-controlled through `POST /auth/v1/signup` with the public anon key (the app's zod `registerSchema` and in-app throttle don't apply). Names like `Admin`, `Smartmind`, `Smartmind Team`, `Former member` (the label the site uses for deleted authors), RTL-override (`‮`), zero-width (`​​` passes the 2-char minimum), tabs/newlines, homoglyphs are all accepted. No uniqueness, so members can also clone each other's names. React escaping prevents XSS; this is a social-engineering problem. The trigger can't break signup (length is clamped, `->>` on non-object JSON returns NULL, `on conflict do nothing`), so that part is safe.
- Demo:
  ```http
  POST /auth/v1/signup   apikey: <anon>
  {"email":"x@attacker.tld","password":"............","data":{"display_name":"Smartmind​ Admin"}}
  ```
  then `GET /rest/v1/member_profiles?select=display_name&id=eq.<id>` as anon → `"Smartmind​ Admin"` (unconfirmed account, publicly listed: see F-03).
- Fix:
  ```sql
  create or replace function public.clean_display_name(t text) returns text
  language sql immutable set search_path = public as $$
    select left(btrim(regexp_replace(normalize(coalesce(t,''), NFKC),
      '[\u0000-\u001F\u007F-\u009F​-‏ -‮⁠-⁯﻿]', '', 'g')), 80) $$;
  revoke all on function public.clean_display_name(text) from public, anon, authenticated;
  alter table public.member_profiles add constraint member_display_name_clean check (
    display_name = public.clean_display_name(display_name)
    and display_name !~* '(^|\W)(admin|administrator|smartmind|moderator|former member)(\W|$)') not valid;
  -- and in handle_new_member: dn := public.clean_display_name(new.raw_user_meta_data->>'display_name');
  -- falling back to 'Member' (not the email local part, see F-04) when the result is reserved or < 2 chars.
  ```
  Also require `public.is_verified_member()` in the USING clause of "member_profiles: update own".

### F-03 Medium, CONFIRMED: anon can enumerate every account, including never-confirmed sign-ups and the admins
- Where: `20261030000200_community.sql:174` (anon column grant) + `:198-199` (`using (not blocked)`, no confirmation or "has posted" condition).
- Impact: `GET /rest/v1/member_profiles?select=id,display_name,bio,photo_path,created_at` returns the full user base with sign-up timestamps. Every signup row appears immediately, before email confirmation, so scripted signups (captcha is off: `config.toml` `[auth.captcha]` commented out) put arbitrary names and bio text (spam links, 500 chars) into a public table. Admin accounts are in it too (F-04).
- Demo: `curl "$URL/rest/v1/member_profiles?select=id,display_name,created_at&order=created_at.asc" -H "apikey: $ANON"`.
- Fix: only expose profiles that the public site needs (authors of live content), and never unconfirmed ones:
  ```sql
  drop policy "member_profiles: public reads unblocked" on public.member_profiles;
  create or replace function public.member_is_public(m uuid) returns boolean
  language sql stable security definer set search_path = public, auth as $$
    select exists (select 1 from auth.users u join public.member_profiles p on p.id = u.id
                   where u.id = m and u.email_confirmed_at is not null and not p.blocked)
       and not exists (select 1 from public.profiles a where a.id = m) $$;
  revoke all on function public.member_is_public(uuid) from public;
  grant execute on function public.member_is_public(uuid) to anon, authenticated;
  create policy "member_profiles: public reads confirmed members" on public.member_profiles
    for select to anon, authenticated using (public.member_is_public(id));
  ```
  (Optionally further restrict to members with at least one live post or comment; embedded `author:member_profiles!author_id(...)` reads in `lib/blog/rows.ts` keep working.)

### F-04 Medium, CONFIRMED: admin accounts get a public member profile named after their email local part
- Where: backfill `20261030000200_community.sql:37-43`, fallback in `handle_new_member` `:26`. Also runs in `hosted-add-community.sql` against the live project, and every later `npm run create-admin` creates a user whose trigger-made profile uses the email local part (create-admin sends no `display_name`).
- Impact: anon learns each admin's `auth.users.id` and email handle (e.g. `alphagrid.official`) → targeted phishing / credential stuffing on `/login`. Same leak for any member who signs up through the raw API without `display_name`.
- Demo: `GET /rest/v1/member_profiles?select=id,display_name,created_at&order=created_at.asc&limit=5` as anon → oldest rows are the admins.
- Fix:
  ```sql
  update public.member_profiles m set display_name = 'Smartmind team'
    where exists (select 1 from public.profiles p where p.id = m.id);  -- or delete these rows
  -- handle_new_member: replace the split_part(email) fallback with dn := 'Member';
  ```
  plus the `not exists (... public.profiles ...)` clause in F-03's policy.

### F-05 Medium, CONFIRMED: `media` bucket is listable by anon; leaks unpublished/scheduled covers and member UUIDs
- Where: `20261014000000_init.sql:102-103` (`for select to anon, authenticated using (bucket_id = 'media')`). A public bucket does not need a SELECT policy to serve `/object/public/...`; the policy only adds the list/search API.
- Demo:
  ```http
  POST /storage/v1/object/list/media   apikey: <anon>  Authorization: Bearer <anon>
  {"prefix":"covers/2026/","limit":1000,"offset":0,"sortBy":{"column":"created_at","order":"desc"}}
  ```
  Returns cover filenames for drafts and scheduled posts (e.g. an award announced next week), and `{"prefix":"members/"}` lists every uploader's UUID folder, including deleted accounts' leftovers (F-09).
- Fix (public URLs keep working; signed-in admins still list via their own policy):
  ```sql
  drop policy "media: public read" on storage.objects;
  create policy "media: admin lists" on storage.objects for select to authenticated
    using (bucket_id = 'media' and public.is_admin());
  create policy "media: member lists own folder" on storage.objects for select to authenticated
    using (bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
           and (storage.foldername(name))[2] = auth.uid()::text);
  ```
  Check before shipping: `upload(..., {upsert:true})` needs SELECT on the row, which the two policies above still give to the owner.

### F-06 Medium, CONFIRMED: post/comment rate limits can be churned (delete and re-insert) and raced (parallel inserts)
- Where: `20261030000200_community.sql:140-166`. The limit counts *rows that still exist*; members may delete their own posts (`:221`) and comments (`:235`). Under READ COMMITTED, N concurrent inserts each count the same committed rows. `author_id is null` is **not** a bypass: the INSERT policies require `author_id = auth.uid()`.
- Demo: loop { insert 30 comments; `DELETE /rest/v1/blog_comments?author_id=eq.<me>` } → unlimited comment notifications/spam churn; or fire 50 `POST /rest/v1/blog_comments` in parallel → most succeed.
- Fix: count attempts in a ledger that deletes don't touch, and serialise per author.
  ```sql
  create table public.member_write_log (author_id uuid not null, kind text not null, at timestamptz not null default now());
  create index member_write_log_idx on public.member_write_log (author_id, kind, at desc);
  alter table public.member_write_log enable row level security;  -- no policies: invisible to clients
  revoke all on public.member_write_log from anon, authenticated;
  create or replace function public.limit_blog_comments() returns trigger
  language plpgsql security definer set search_path = public as $$
  begin
    perform pg_advisory_xact_lock(hashtext('comment:' || new.author_id::text));
    if (select count(*) from public.member_write_log
        where author_id = new.author_id and kind = 'comment' and at > now() - interval '1 hour') >= 30 then
      raise exception 'You are commenting too fast. Try again later.' using errcode = 'P0001';
    end if;
    insert into public.member_write_log (author_id, kind) values (new.author_id, 'comment');
    return new;
  end $$;
  -- same shape for limit_blog_posts (kind 'post', limit 10); add a 'like' limit too (F-12).
  ```

### F-07 Medium, CONFIRMED: members can upload unlimited files (5 MB each) and nothing ever deletes them
- Where: `20261030000200_community.sql:309-313` (insert policy: own folder + verified, no count/size budget); bucket limit is per file (`init.sql:96`).
- Impact: one verified account can push gigabytes into the public bucket (storage/egress bill, public hosting of arbitrary images). Combined with F-05 the files are discoverable.
- Demo: loop `POST /storage/v1/object/media/members/<uid>/<n>.png` with 5 MB bodies.
- Fix:
  ```sql
  create or replace function public.member_upload_budget_ok() returns boolean
  language sql stable security definer set search_path = public, storage as $$
    select count(*) < 50 and coalesce(sum((metadata->>'size')::bigint),0) < 50*1024*1024
    from storage.objects where bucket_id = 'media'
      and (storage.foldername(name))[1] = 'members' and (storage.foldername(name))[2] = auth.uid()::text $$;
  revoke all on function public.member_upload_budget_ok() from public, anon;
  grant execute on function public.member_upload_budget_ok() to authenticated;
  -- add "and public.member_upload_budget_ok()" to "media: member insert own folder"
  ```
  plus a scheduled cleanup of files not referenced by `member_profiles.photo_path` / `blog_posts.cover_path`.

### F-08 Medium, HYPOTHESIS: `create-admin` promotes an existing self-registered account (pre-account takeover if the hosted project auto-confirms emails)
- Where: `scripts/create-admin.ts:35-50`: if a user with that email exists, it sets a password, **forces `email_confirm: true`** and upserts `profiles(role='admin')`. It does not revoke the account's existing sessions/refresh tokens and keeps the attacker's `raw_user_meta_data`/member profile.
- Condition: if the hosted project has "Confirm email" off (local `config.toml:227` has it on, hosted is not in the repo), an attacker can pre-register `admin@<domain>` and hold a valid refresh token. When the operator later runs `create-admin` for that address, the attacker's token now satisfies `is_admin()` (it reads `profiles` live). Even with confirmation on, the script marks an address as confirmed that nobody proved.
- Verify: Dashboard > Auth > Providers > Email > "Confirm email"; and `select id, created_at, email_confirmed_at, raw_user_meta_data from auth.users where email = '<admin email>'` before promoting.
- Fix: in the script, refuse to promote a pre-existing user that the script did not create unless `--force`, and on promotion run
  ```sql
  delete from auth.sessions where user_id = '<id>';   -- kills refresh tokens (cascade)
  update auth.users set raw_user_meta_data = '{}'::jsonb where id = '<id>';
  ```

---

## Low

### F-09 Low, CONFIRMED: account deletion leaves the member's uploaded files public forever
- Where: `app/members-actions.ts:174-177` removes only `profile.photoPath`; `delete_my_account` (`20261030000400_delete_account_keeps_blocks.sql:6-17`) deletes `auth.users` directly, which never touches `storage.objects`. Blog covers and any other files under `members/<uid>/` stay public and listable (F-05). Photo is removed *before* the RPC, so a failed RPC still loses the photo.
- Demo: upload cover, delete account, `GET /storage/v1/object/public/media/members/<old-uid>/<file>.png` → 200.
- Fix: inside `delete_my_account`, before deleting the user (storage rows only; the bytes need the Storage API or a cleanup job):
  ```sql
  insert into public.storage_gc (name) select name from storage.objects
    where bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
      and (storage.foldername(name))[2] = auth.uid()::text;
  ```
  and have a service-role job delete `storage_gc` entries via the Storage API (do not `delete from storage.objects` directly; that orphans the S3 objects). Keep covers referenced by surviving public posts, or null those `cover_path`s.

### F-10 Low (Medium if true), HYPOTHESIS: `delete_my_account` may fail for any member who has uploaded a file
- Where: `20261030000400_delete_account_keeps_blocks.sql:15` deletes from `auth.users` in SQL. Older Supabase storage schemas had `storage.objects.owner → auth.users(id)` without ON DELETE; if that FK still exists on the hosted project, the delete raises 23503 and the member cannot delete their account. Tests never cover it: alice's upload is removed by the service client before teardown (`community.test.ts:425`), and frank/gina never upload.
- Verify: `select conname, confdeltype from pg_constraint where conrelid = 'storage.objects'::regclass and contype = 'f';`
- Fix if present: clear `owner`/`owner_id` for the member's objects in `delete_my_account` before the user delete, or switch account deletion to the GoTrue admin API from a server route.

### F-11 Low, CONFIRMED: ban evasion and block race around account deletion
- Where: `20261030000400_delete_account_keeps_blocks.sql:11-15`.
  (a) A blocked member deletes the account and re-registers the same email at once (blocking is keyed on the uuid, not the address).
  (b) A member who sees moderation coming deletes first: content becomes "Former member" (`author_ok(null) = true`, `community.sql:59`) and can no longer be blocked in bulk.
  (c) Race: the `blocked` check reads a snapshot; an admin block that commits between the check and the `delete` leaves content public.
- Fix:
  ```sql
  create table public.blocked_emails (email_hash text primary key, at timestamptz default now());
  alter table public.blocked_emails enable row level security; revoke all on public.blocked_emails from anon, authenticated;
  -- in delete_my_account: select ... from public.member_profiles where id = auth.uid() FOR UPDATE; (serialises with admin_set_member_blocked)
  -- when blocked: insert into blocked_emails values (encode(digest(lower(email),'sha256'),'hex'));
  -- in handle_new_member: if the new email's hash is in blocked_emails, insert the profile with blocked = true.
  ```

### F-12 Low, CONFIRMED: likes have no rate limit; every like/unlike rewrites the post row and bumps `updated_at`
- Where: `20261030000200_community.sql:123-136` + `blog_posts_set_updated_at` (`:85-86`). The counter is drift-free under normal use (row lock on update, cascades fire the trigger, `greatest(…,0)` floors), but toggling a like in a loop makes `updated_at` look like a fresh edit, bloats the table and contends on the post row. Likes from later-blocked sock puppets keep counting.
- Fix: make `set_updated_at` ignore counter-only updates, and add a like limit (F-06 ledger):
  ```sql
  create or replace function public.blog_posts_touch() returns trigger language plpgsql as $$
  begin
    if (to_jsonb(new) - 'like_count' - 'updated_at') is distinct from (to_jsonb(old) - 'like_count' - 'updated_at')
    then new.updated_at = now(); end if; return new; end $$;
  drop trigger blog_posts_set_updated_at on public.blog_posts;
  create trigger blog_posts_set_updated_at before update on public.blog_posts for each row execute function public.blog_posts_touch();
  ```
  Optionally a nightly `update blog_posts p set like_count = (select count(*) from blog_likes l where l.post_id = p.id)`.

### F-13 Low, CONFIRMED: anon can call `author_ok(uuid)` as an oracle for "is this member blocked"
- Where: grant at `20261030000200_community.sql:301-306`. Member ids are public (comments' `author_id`, F-03). `POST /rest/v1/rpc/author_ok {"a":"<uuid>"}` → `false` means blocked. Same for `post_is_live`/`is_post_author` (harmless).
- Fix: move the policy helpers out of the exposed schema so PostgREST cannot call them:
  ```sql
  create schema if not exists private; grant usage on schema private to anon, authenticated;
  alter function public.author_ok(uuid) set schema private;  -- policies follow the function by OID
  ```
  (repeat for `post_is_live`, `is_post_author`, `is_verified_member`; keep `is_admin` callable only if the app needs it via RPC.)

### F-14 Low, CONFIRMED: missing indexes on auth/delete paths, and per-row function calls in policies
- `blog_comments.author_id` has no index (`community.sql:104-113`): `limit_blog_comments` seq-scans on every comment insert; account deletion (`on delete set null`) and `delete_my_account`'s `update blog_comments … where author_id` seq-scan.
- `blog_likes.user_id` has no index (PK leads with `post_id`, `:120`): cascade on account deletion seq-scans.
- `blog_posts` rate limit filters `(author_id, created_at)` but only `(author_id)` is indexed.
- Policies call `auth.uid()`, `public.is_admin()`, `public.is_verified_member()` per row; wrap them as `(select auth.uid())` etc. so Postgres evaluates them once per statement (Supabase advisor 0003).
- Fix:
  ```sql
  create index blog_comments_author_idx on public.blog_comments (author_id, created_at desc);
  create index blog_likes_user_idx on public.blog_likes (user_id);
  create index blog_posts_author_created_idx on public.blog_posts (author_id, created_at desc);
  ```

### F-15 Low, CONFIRMED: a post author can delete comments the admin has hidden on their post
- Where: `community.sql:235-236` (`author_id = auth.uid() or public.is_post_author(post_id)`, no `not hidden` and no check that the deleter is unblocked). Moderation evidence of abusive comments can be wiped by the post author or by the commenter (the commenter can also delete their own hidden comments).
- Fix:
  ```sql
  drop policy "blog_comments: author or post author deletes" on public.blog_comments;
  create policy "blog_comments: author or post author deletes" on public.blog_comments
    for delete to authenticated using (not hidden and (author_id = auth.uid() or public.is_post_author(post_id)));
  ```

### F-16 Low, CONFIRMED: `handle_new_member` failing would block every signup
- Where: `community.sql:21-35`. Today it cannot fail on input (see F-02), but any future constraint added to `member_profiles` (e.g. F-02's CHECK) that the trigger's value violates turns every `/auth/v1/signup` into a 500 "Database error saving new user". During `hosted-clean-install.sql`, between `drop schema public cascade` and re-creation, the trigger is gone, so signups in that window get no profile and are locked out of the community (`getMember` returns null when the profile row is missing, `lib/members/session.ts:32`).
- Fix: make the trigger defensive and add a self-heal:
  ```sql
  -- inside handle_new_member:
  begin
    insert into public.member_profiles (id, display_name) values (new.id, dn) on conflict do nothing;
  exception when others then
    insert into public.member_profiles (id, display_name) values (new.id, 'Member') on conflict do nothing;
  end;
  -- and a backfill: insert into member_profiles (id, display_name) select id, 'Member' from auth.users on conflict do nothing;
  ```

### F-17 Low, CONFIRMED: members can bump/backdate `published_at` and edit after publication without any limit
- Where: update grant includes `status, published_at` (`community.sql:181-182`); updates are not rate-limited. A member can set `published_at = now()` repeatedly to stay at the top of the feed, backdate to 1970, or swap a liked post's body (bait-and-switch).
- Fix: trigger that keeps `published_at` once set (`if old.published_at is not null and old.status = 'published' then new.published_at := old.published_at`) and an edit limit via the F-06 ledger.

---

## Info

### F-18 Info, CONFIRMED: trigger functions keep the default PUBLIC EXECUTE
`set_updated_at` (`init.sql:42`), `handle_new_member` (`community.sql:21`), `blog_like_counter` (`:123`), `limit_blog_posts` (`:140`), `limit_blog_comments` (`:154`), `milestone_takes_post_tbc`, `post_tbc_to_milestones` (`20261020000000_milestone_follows_post.sql:5,19`) have no `revoke`. `hosted-clean-install.sql:14` even re-grants ALL on future functions to anon/authenticated. Not exploitable: functions returning `trigger` cannot be called outside a trigger ("trigger functions can only be called as triggers"). For hygiene:
```sql
revoke all on function public.set_updated_at(), public.handle_new_member(), public.blog_like_counter(),
  public.limit_blog_posts(), public.limit_blog_comments(), public.milestone_takes_post_tbc(),
  public.post_tbc_to_milestones() from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
```
Every non-trigger SECURITY DEFINER function (`is_admin`, `is_verified_member`, `author_ok`, `post_is_live`, `is_post_author`, `admin_set_*`, `delete_my_account`, `admin_list_members`) **does** have `set search_path` and an explicit `revoke ... from public` (`init.sql:63`, `community.sql:282-291`, `admin_members.sql:18`). `create or replace` in the 0400 migration keeps those grants.

### F-19 Info, CONFIRMED: hosted install files match the migrations; preamble differences only
- All 15 sections of `hosted-clean-install.sql` and the 5 sections of `hosted-add-community.sql` are identical to the migrations (diff -w -B). Only extra in `hosted-add-community.sql` is a trailing `notify pgrst`.
- Preamble of `hosted-clean-install.sql:9-27`: `drop schema public cascade`, explicit `alter default privileges … grant all … to anon, authenticated` (lines 13-15, same as Supabase's defaults, but it means every *future* table/function is anon-granted until revoked), drops storage policies, `delete from auth.users`. It does **not** delete the bucket's files, so old `members/<uid>/` objects of now-deleted users survive a "clean" install.
- Both hosted files are listed in `.git/info/exclude`, so the SQL the live site was installed from is not versioned. `hosted-add-community.sql` assumes migrations 0014-1023 were already applied on the hosted project; nothing checks that.
- The repo cannot prove the live DB matches. Run on hosted: `select polname, cmd, roles, qual, with_check from pg_policies where schemaname in ('public','storage') order by 1;` and `select p.proname, p.prosecdef, p.proconfig, p.proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';` and diff against a local `supabase db reset`.

### F-20 Info, CONFIRMED (not exploitable): `email_confirmed_at` trust and email change
`is_verified_member` (`community.sql:47-54`) and `getMember().verified` (`lib/members/session.ts:33`) trust `auth.users.email_confirmed_at`. GoTrue only writes the new address into `email` after the change link is confirmed, so an unverified new address does not inherit verified status. Locally `double_confirm_changes = true` (`config.toml:225`). HYPOTHESIS for hosted: if "Confirm email" is off (autoconfirm), email changes may apply immediately and `admin_list_members` would show an address the member never proved. Also `secure_password_change = false` (`config.toml:229`): a stolen session can change the password without re-auth (auth config, not DB).

### F-21 Info, CONFIRMED: JWTs after block / deletion
Blocking is enforced live on each statement (`is_verified_member`, `author_ok`, the `not blocked` USING clause), so an existing JWT is cut off from writing at once; a blocked member can still delete their own comments/likes/files (by design). After `delete_my_account`, `auth.sessions` rows cascade so refresh fails; the access token stays valid until `exp` (`jwt_expiry = 3600`) but every write policy fails because the member row is gone. Only remaining power: deleting objects in their old storage folder (harmless).

### F-22 Info, CONFIRMED: residual default privileges on admin tables
`authenticated` keeps SELECT/REFERENCES/TRIGGER on `profiles` (`init.sql:92` revokes only insert/update/delete/truncate) and full DML grants on all admin content tables; RLS is enabled on **every** table in `public` and the only write policies require `is_admin()`. Not exploitable through PostgREST (no DDL); tidy with `revoke references, trigger on all tables in schema public from anon, authenticated;`.

### F-23 Info: privilege escalation checks that came back clean
- `profiles`: no INSERT/UPDATE/DELETE grant or policy for clients; read-own only. `is_admin()` reads it with `auth.uid()`, stable, search_path pinned.
- `member_profiles`: no INSERT grant; UPDATE column grant excludes `blocked`, `id`; WITH CHECK pins `id`.
- `blog_posts`: INSERT/UPDATE column grants exclude `hidden`, `like_count`, `id`, `created_at`; `author_id` is insert-only and must equal `auth.uid()` (so the `author_id is null` rate-limit bypass is blocked by RLS).
- `blog_comments`: no UPDATE at all; `blog_likes`: no UPDATE, so upsert tricks fail; reads own likes only.
- `admin_list_members` / `admin_set_*`: raise unless `is_admin()`; anon and members get errors (tested).
- Storage: insert/update constrained to `members/<own uid>/…`; `..` in an object name is stored literally (no overwrite of `covers/...`), only the `mediaUrl` rendering issue in F-01 remains.

---

## What the RLS tests do NOT cover

`tests/rls/rls.test.ts`, `community.test.ts`, `blog-reads.test.ts`, `home-sections.test.ts`, `medium.test.ts`:

1. **Self-signup through `/auth/v1/signup`**: every test user is made with the service key (`auth.admin.createUser`, `email_confirm: true`). Nothing tests an unconfirmed real signup, hostile `display_name` metadata, missing metadata (email-local-part fallback), or that an unconfirmed account cannot post/comment/like/upload (only `dave`'s post insert is tested after manually nulling `email_confirmed_at`, and only with Docker).
2. **What anon can enumerate**: no test of `select * from member_profiles` as anon (all members, admins, unconfirmed), of anon column restrictions (`blocked`, `updated_at` not selectable), or of bucket listing (`storage.list`).
3. **Path columns**: no test that `photo_path`/`cover_path` reject other folders, other members' files, `../`, or URLs via direct PostgREST.
4. **Profile updates**: no test that a member cannot set `blocked`, cannot update another member's profile, or that a blocked or unverified member cannot update their profile.
5. **Rate-limit evasion**: no test of delete-and-repost, parallel inserts, or like toggling; no like limit exists to test.
6. **Comment deletion rules**: post author deleting a *hidden* comment; a blocked member deleting comments; unrelated member deleting someone else's like.
7. **RPC surface**: no test that anon can/can't call `author_ok`, `post_is_live`, `is_post_author`, `is_verified_member`, `is_admin`, `delete_my_account` (anon), or that every SECURITY DEFINER function has `search_path` and no PUBLIC EXECUTE (a `pg_proc` catalog assertion would catch regressions).
8. **Account deletion side effects**: deleting a member who has uploaded files (F-10), who has likes (counter decrement), comments on others' posts, or whose posts were already hidden; storage leftovers; re-registration with the same email after a block; concurrency with an admin block.
9. **Session after block / delete**: no test that an existing JWT loses write access immediately after `admin_set_member_blocked`, or after `delete_my_account`.
10. **Storage update/delete/upsert**: only INSERT into another member's folder and into `covers/` is tested; not UPDATE/move/DELETE of another member's object, unverified upload, or an upload of a disallowed MIME type by a member.
11. **Like-counter integrity**: only a single like/unlike. Not post deletion with likes, member deletion with likes, duplicate like race, liking a hidden or draft post, liking as blocked.
12. **`create-admin` against a pre-existing member account**, and `delete_my_account` refusing admin is tested only for the `profiles` side, not that the admin's `member_profiles` row stays out of public view.
13. **Admin tables as an authenticated member** for the newer tables: `team_*`, `awards`, `publications`, `partners`, `research_*`, `work_people`, `milestones`, `research_spotlights`, `collab_projects` have no member-write tests (only `posts`, `medium_articles`, `home_sections` do).
14. **Hosted parity**: no test or script asserts that the hosted DB's policies/grants equal the migrations.
