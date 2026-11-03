# Putting the security update on the live Supabase project

This is the step-by-step for the two new database files (`20261101000000_member_hardening.sql` and `20261101000100_media_listing.sql`). It is written for the live project that already holds your posts, members and uploaded images. **The site stays online the whole time.** The database changes take a fraction of a second on a project this size, and nothing here deletes a post, a comment, a member or a file.

## What these two files actually change

| Change                                                                                      | Effect on your content                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Member display names are cleaned, and names such as "Admin" or "Smartmind Team" are refused | A member whose current name contains `admin`, `administrator`, `smartmind`, `moderator` or `former member` is renamed to **Member**. Hidden or odd characters in a name are removed. Everyone else keeps their name. |
| Admin accounts' member profile is renamed **Site team** and hidden from the public          | Nothing changes unless the admin has written community posts or comments; those would then show as **Former member** (pre-flight check 7 tells you).                                                                 |
| Unconfirmed accounts are no longer listed publicly                                          | Only affects accounts that never confirmed their email.                                                                                                                                                              |
| A profile photo reference must look like `members/<member id>/<id>.jpg`, `.png` or `.webp`  | A photo reference in any other shape is **cleared** (the image file stays in storage; the member simply has no photo until they upload one). Pre-flight check 6 lists them.                                          |
| A blog cover must be in its author's own folder when it is **set or changed**               | Existing posts are not touched and stay editable.                                                                                                                                                                    |
| A comment hidden by an admin can no longer be deleted by its writer or the post's author    | Nothing changes for existing comments.                                                                                                                                                                               |
| The `media` bucket can no longer be **listed** by visitors                                  | Image links keep working (the bucket is public). Pre-flight check 5 makes sure it really is public before anything is dropped.                                                                                       |

The only existing rows these files modify are in `member_profiles` (names, photo references, and one new row for any account that has none). That is why step 1 copies that table first.

You need: the Supabase dashboard for the live project, about 20 minutes, and this repository open on the branch `audit/auth-hardening` (so you can open the two `.sql` files from `supabase/migrations/`).

---

## Step 1: Take a safety copy

1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Paste and **Run**:

   ```sql
   create table public.backup_member_profiles_20261104 as
   select * from public.member_profiles;

   select count(*) as rows_copied from public.backup_member_profiles_20261104;
   ```

   The number should equal your member count (your notes say 3). This copy is what the rollback in step 8 restores from.

3. **Optional but recommended** (needs Docker running on your computer and the database password): in a terminal in the project folder,

   ```bash
   npx supabase db dump --linked --data-only -f backup-data-2026-11-04.sql
   ```

   Keep the file somewhere safe; do **not** commit it. Free Supabase projects have no automatic backups to fall back on, so this file is your full-content safety net. If your plan has **Database → Backups**, check that a recent one exists as well.

Uploaded files are not part of any database dump, and these changes never touch them.

---

## Step 2: Pre-flight check (read only)

Paste this into a new SQL Editor query and **Run**. It only reads. It returns one row per thing worth looking at; **no rows means all clear**.

```sql
select * from (

  -- 1. Tables and functions the two files rely on must exist.
  select 'STOP 1 missing table' as check, t as detail
  from unnest(array['member_profiles','profiles','blog_posts','blog_comments','blog_likes']) t
  where to_regclass('public.' || t) is null

  union all
  select 'STOP 1 missing function', n
  from unnest(array['set_updated_at','handle_new_member','blog_like_counter','limit_blog_posts',
    'limit_blog_comments','milestone_takes_post_tbc','post_tbc_to_milestones','is_admin',
    'is_verified_member','is_post_author']) n
  where not exists (select 1 from pg_proc p where p.proname = n and p.pronamespace = 'public'::regnamespace)

  -- 2. The policies the files replace must have exactly these names.
  union all
  select 'STOP 2 policy not found under the expected name', v.sch || '.' || v.tbl || ': ' || v.pol
  from (values
    ('public','member_profiles','member_profiles: public reads unblocked'),
    ('public','member_profiles','member_profiles: update own'),
    ('public','blog_comments','blog_comments: author or post author deletes'),
    ('storage','objects','media: public read')
  ) v(sch, tbl, pol)
  where not exists (select 1 from pg_policies p
    where p.schemaname = v.sch and p.tablename = v.tbl and p.policyname = v.pol)

  -- 3. Any OTHER policy that lets people read storage files would keep the media list open.
  union all
  select 'CHECK 3 another storage read policy (would keep listing open if it covers media)',
    policyname || ' [' || cmd || '] to ' || array_to_string(roles, ',') || ' using ' || coalesce(qual, '')
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and cmd in ('SELECT', 'ALL') and policyname <> 'media: public read'

  -- 4. Names the files create must not exist yet (if they do, one was partly applied before).
  union all
  select 'STOP 4 already exists', conname::text from pg_constraint
  where conname in ('member_display_name_clean', 'member_photo_own_folder')
  union all
  select 'STOP 4 already exists', tgname::text from pg_trigger
  where tgname in ('blog_posts_cover_path', 'member_profiles_clean_name')
  union all
  select 'STOP 4 already exists', policyname from pg_policies
  where policyname in ('member_profiles: public reads confirmed members', 'media: admin lists',
    'media: member lists own folder')

  -- 5. The media bucket must be PUBLIC, or every image link depends on the policy being dropped.
  union all
  select 'STOP 5 media bucket is not public or does not exist', coalesce(b.id, 'media')
  from (select 1) one left join storage.buckets b on b.id = 'media'
  where b.id is null or not b.public

  -- 6. What happens to each existing member (information; read each row).
  union all
  select 'CHECK 6 admin profile will be renamed "Site team"',
    m.id || ' currently "' || m.display_name || '"'
  from public.member_profiles m where exists (select 1 from public.profiles p where p.id = m.id)
  union all
  select 'CHECK 6 name will be changed',
    m.id || ' "' || m.display_name || '"'
  from public.member_profiles m
  where not exists (select 1 from public.profiles p where p.id = m.id)
    and (m.display_name <> normalize(m.display_name, NFKC)
      or m.display_name ~ '[\u0000-\u001F\u007F-\u009F­͏؜ᅟᅠ឴឵᠋-᠎​-‏‪-‮⁠-⁯ㅤ﻿ﾠ￹-￻\u0085  ]'
      or m.display_name <> btrim(m.display_name)
      or char_length(m.display_name) < 2 or char_length(m.display_name) > 80)
  union all
  select 'CHECK 6 name contains a reserved word and will become "Member"',
    m.id || ' "' || m.display_name || '"'
  from public.member_profiles m
  where not exists (select 1 from public.profiles p where p.id = m.id)
    and m.display_name ~* '(^|\W)(admin|administrator|smartmind|moderator|former member)(\W|$)'
  union all
  select 'CHECK 6 photo reference will be cleared (the file itself stays in storage)',
    m.id || ' ' || m.photo_path
  from public.member_profiles m
  where m.photo_path is not null and m.photo_path !~ (
    '^members/' || m.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')

  -- 7. Writing by people the public will no longer see: it will read "Former member".
  union all
  select 'CHECK 7 posts by admins or unconfirmed accounts will read "Former member"', count(*)::text
  from public.blog_posts b
  where b.author_id in (select id from public.profiles)
     or b.author_id in (select id from auth.users where email_confirmed_at is null)
  having count(*) > 0
  union all
  select 'CHECK 7 comments by admins or unconfirmed accounts will read "Former member"', count(*)::text
  from public.blog_comments c
  where c.author_id in (select id from public.profiles)
     or c.author_id in (select id from auth.users where email_confirmed_at is null)
  having count(*) > 0

) problems order by 1, 2;
```

### How to read the result

| Row starts with | Meaning                                                                                                                    | What to do                                                                                                                                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STOP 1`        | A table or function the files need is missing, so the live database is behind.                                             | **Do not continue.** Apply the earlier migrations first (section 1 of `community-setup.md`), then run this check again.                                                                                                                                                                                                  |
| `STOP 2`        | A policy has a different name on the live project, so the file would stop with an error (nothing is changed when it does). | **Do not continue.** Send me the row; the file needs the live name.                                                                                                                                                                                                                                                      |
| `STOP 4`        | A previous attempt was partly applied.                                                                                     | **Do not continue.** Compare with the file before doing anything.                                                                                                                                                                                                                                                        |
| `STOP 5`        | The `media` bucket is not public (or missing). Dropping the read policy would break every image.                           | **Do not apply the second file.** Find out why first.                                                                                                                                                                                                                                                                    |
| `CHECK 3`       | Another policy can read storage files.                                                                                     | Open it: if it covers the `media` bucket for `anon`/`public`, visitors can still list files after the update. Tell me and I will add it to the second file. If it is for another bucket, ignore it.                                                                                                                      |
| `CHECK 6`       | Information about members that will be renamed or have a photo reference cleared.                                          | Read each row. A real person's name changing to **Member** is probably not what you want: set a new plain name for them first (`update public.member_profiles set display_name = 'New Name' where id = '...';`) and run the check again. A photo reference that will be cleared: either accept it or fix the path first. |
| `CHECK 7`       | A count of posts or comments that will show as **Former member**.                                                          | If the number is above 0, decide first: accept the label, or tell me and I will change who counts as public.                                                                                                                                                                                                             |

Continue only when there is no `STOP` row, and you are happy with every `CHECK` row.

---

## Step 3: Check how the project was set up

Run this in the SQL Editor:

```sql
select version from supabase_migrations.schema_migrations order by 1;
```

- **It lists versions up to `20261030000400`** (the earlier migrations) → the project was set up with the CLI. You can use **Method A** in step 4.
- **It fails with "relation does not exist", or the list is short or empty** → the project was set up by pasting SQL. Use **Method B** in step 4. (Do not use `supabase db push`: it would try to run the old files again.)

---

## Step 4: Apply the first file (members)

### Method B: SQL Editor (works for every project)

1. Open `supabase/migrations/20261101000000_member_hardening.sql` in your editor and copy the **whole** file.
2. SQL Editor → **New query**. Type `begin;` on the first line, paste the file, and type `commit;` on the last line. The `begin`/`commit` makes it all-or-nothing: if any statement fails, nothing is changed.
3. Press **Run**. The editor may warn that the query contains destructive operations (the file drops and re-creates policies and constraints); that is expected, confirm. Expected result: "Success. No rows returned".
4. If it shows an error: nothing was applied. Do not retry blindly; copy the error text and send it to me.

### Method A: CLI

```bash
npx supabase migration list          # compare local and remote columns
npx supabase db push --dry-run       # shows exactly which files it would apply
```

`--dry-run` must list **only** `20261101000000_member_hardening.sql` and `20261101000100_media_listing.sql`. If it lists anything else, stop. Otherwise run `npx supabase db push`: it applies both files, in order, each in its own transaction. Then skip step 5 and go to step 6.

---

## Step 5: Apply the second file (media listing)

Method B again: copy `supabase/migrations/20261101000100_media_listing.sql`, wrap it in `begin;` … `commit;`, **Run**.

If it says _"must be owner of table objects"_: open **Storage → Policies**, find `media: public read` under the `media` bucket and delete it; then add two **SELECT** policies for `authenticated`:

- name `media: admin lists`, expression `bucket_id = 'media' and public.is_admin()`
- name `media: member lists own folder`, expression `bucket_id = 'media' and (storage.foldername(name))[1] = 'members' and (storage.foldername(name))[2] = (select auth.uid())::text`

---

## Step 6: Check that everything still works

**In the SQL Editor** (each should give the stated result):

```sql
-- invisible characters survived the paste: expect true
select public.clean_display_name('a' || chr(8203) || 'b') = 'ab' as clean_function_works;

-- the old policies are gone and the new ones are there
select tablename, policyname from pg_policies
where policyname in ('media: public read', 'member_profiles: public reads unblocked',
  'member_profiles: public reads confirmed members', 'media: admin lists', 'media: member lists own folder')
order by 1, 2;

-- member count unchanged, backups agree
select (select count(*) from public.member_profiles) as now_rows,
       (select count(*) from public.backup_member_profiles_20261104) as backup_rows;
```

Expected: `true`; exactly **three** rows (`media: admin lists`, `media: member lists own folder`, `member_profiles: public reads confirmed members`; the two old policies must not appear); `now_rows` equal to or greater than `backup_rows` (greater only if some account had no profile).

**In a terminal** (replace the two values with your project URL and anon key from **Project Settings → API**): a visitor can no longer list the bucket, but a public image still loads.

```bash
curl -s -X POST "https://YOUR-PROJECT.supabase.co/storage/v1/object/list/media" \
  -H "apikey: YOUR_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":5}'
# expected: []

curl -s -o /dev/null -w "%{http_code}\n" \
  "https://YOUR-PROJECT.supabase.co/storage/v1/object/public/media/PATH-OF-ANY-EXISTING-IMAGE"
# expected: 200
```

**In the browser, on the live site:**

1. Open the home page and a few pages with images: all images show. Open **Stories → Blog**: posts and their authors' names show.
2. Log in as **admin** → upload an image on any admin page and remove it again.
3. Log in as a **member** (use a test account): change the display name, upload a profile photo, write and edit a draft post with a cover image.
4. Delete one of your own comments on someone's post.

If any step fails, go to step 8.

---

## Step 7: Deploy the app, then the Supabase dashboard settings

1. **Deploy the new app version** (merge the branch and let Vercel build it). Do this **after** the database steps. The old and the new app code both work with the database before and after, so there is no gap, but the new code is what gives people clear messages instead of raw errors.
2. In the Supabase dashboard go through the checklist in section 8 of [`community-setup.md`](community-setup.md): **Site URL**, **Redirect URLs**, **Confirm email** on, **Secure password change** on, **email expiry 1800 seconds**, **minimum password 12**, leaked-password protection if your plan has it, custom SMTP and its hourly limit.
3. **Register one real test account on the live site** and tell me whether the confirmation email arrives (and whether the resend button works). This is still the one thing nobody has been able to check from outside.
4. Later, remove the safety copy once you are happy (give it a week):

   ```sql
   drop table public.backup_member_profiles_20261104;
   ```

---

## Step 8: Rollback (only if something is wrong)

Everything below is safe to run at any time after step 4. It puts the old rules and the old member names and photo references back; nothing else in the database was changed by the two files.

```sql
begin;

-- members file
drop trigger if exists member_profiles_clean_name on public.member_profiles;
drop trigger if exists blog_posts_cover_path on public.blog_posts;
alter table public.member_profiles drop constraint if exists member_display_name_clean;
alter table public.member_profiles drop constraint if exists member_photo_own_folder;

drop policy if exists "member_profiles: public reads confirmed members" on public.member_profiles;
create policy "member_profiles: public reads unblocked" on public.member_profiles
  for select to anon, authenticated using (not blocked);

drop policy if exists "member_profiles: update own" on public.member_profiles;
create policy "member_profiles: update own" on public.member_profiles
  for update to authenticated using (id = auth.uid() and not blocked) with check (id = auth.uid());

drop policy if exists "blog_comments: author or post author deletes" on public.blog_comments;
create policy "blog_comments: author or post author deletes" on public.blog_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_post_author(post_id));

update public.member_profiles m
set display_name = b.display_name, photo_path = b.photo_path
from public.backup_member_profiles_20261104 b
where b.id = m.id;

-- media file
drop policy if exists "media: admin lists" on storage.objects;
drop policy if exists "media: member lists own folder" on storage.objects;
create policy "media: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

commit;
```

The new helper functions and indexes can stay; they do nothing on their own.

## If a message you do not understand appears

Do not run anything further. Copy the exact message and which step you were on and send it to me. Every file above runs inside `begin; … commit;`, so an error means nothing from that file was applied.
