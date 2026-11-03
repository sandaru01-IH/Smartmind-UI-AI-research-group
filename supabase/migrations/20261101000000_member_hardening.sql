-- Smartmind: member data hardening (auth audit, DB findings F-01 to F-04, F-14 to F-16, F-18).
-- What a hand-made request can do is decided here, not in the app: a member's photo and blog covers
-- stay in their own folder, names cannot impersonate or hide, unconfirmed accounts and admins are not
-- listed publicly, and a hidden comment cannot be deleted by the people it is about.

-- ---------------------------------------------------------------- display names
-- Normalises a name: compatibility-composed Unicode (NFKC, so look-alike forms collapse), line breaks
-- and tabs become spaces, invisible and direction-changing characters are removed, ends are trimmed,
-- and it is cut to 80 characters.
create or replace function public.clean_display_name(t text) returns text
language sql immutable set search_path = public as $$
  select btrim(left(btrim(
    regexp_replace(
      regexp_replace(normalize(coalesce(t, ''), NFKC), '[\t\n\r\f\v\u0085  ]', ' ', 'g'),
      '[\u0000-\u001F\u007F-\u009F­͏؜ᅟᅠ឴឵᠋-᠎​-‏‪-‮⁠-⁯ㅤ﻿ﾠ￹-￻]',
      '', 'g')
  ), 80));
$$;

-- Names that would pass for the site or its team, or for the label shown for deleted accounts.
create or replace function public.is_reserved_display_name(t text) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(t, '') ~* '(^|\W)(admin|administrator|smartmind|moderator|former member)(\W|$)';
$$;

-- A name that is safe to store: cleaned, and "Member" when nothing usable is left.
create or replace function public.safe_display_name(t text) returns text
language sql immutable set search_path = public as $$
  select case
    when char_length(public.clean_display_name(t)) < 2 then 'Member'
    when public.is_reserved_display_name(public.clean_display_name(t)) then 'Member'
    else public.clean_display_name(t)
  end;
$$;

-- Existing rows first, so the constraints below can be checked against all of them. The admins'
-- profiles got their email's first part as a name; they are renamed (and hidden further down).
update public.member_profiles m set display_name = 'Site team'
where exists (select 1 from public.profiles p where p.id = m.id);

update public.member_profiles set display_name = public.safe_display_name(display_name)
where display_name is distinct from public.safe_display_name(display_name);

alter table public.member_profiles add constraint member_display_name_clean check (
  display_name = public.clean_display_name(display_name)
  and not public.is_reserved_display_name(display_name)
) not valid;
alter table public.member_profiles validate constraint member_display_name_clean;

-- ---------------------------------------------------------------- photo and cover paths
-- The app only ever writes members/<own id>/<uuid>.<ext>; make the database say the same.
update public.member_profiles set photo_path = null
where photo_path is not null and photo_path !~ (
  '^members/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

alter table public.member_profiles add constraint member_photo_own_folder check (
  photo_path is null or photo_path ~ (
    '^members/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )
) not valid;
alter table public.member_profiles validate constraint member_photo_own_folder;

-- A post's author can be null once their account is gone, so this is checked when a cover is written
-- rather than as a constraint. Rows written before this migration are left as they are.
create or replace function public.blog_cover_own_folder() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.cover_path is not null and (new.author_id is null or new.cover_path !~ (
    '^members/' || new.author_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )) then
    raise exception 'Invalid cover path' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger blog_posts_cover_path before insert or update of cover_path on public.blog_posts
  for each row execute function public.blog_cover_own_folder();

-- ---------------------------------------------------------------- new accounts
-- The name comes from sign-up metadata, which anyone can set with the public key, so it is cleaned
-- here. It never falls back to the email, and nothing in it can stop the sign-up: if the profile
-- insert fails for any reason it is made again with the neutral name.
create or replace function public.handle_new_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into public.member_profiles (id, display_name)
    values (new.id, public.safe_display_name(new.raw_user_meta_data ->> 'display_name'))
    on conflict do nothing;
  exception when others then
    insert into public.member_profiles (id, display_name) values (new.id, 'Member') on conflict do nothing;
  end;
  return new;
end;
$$;

-- Accounts that were created while no profile could be (see the audit): give them one.
insert into public.member_profiles (id, display_name)
select id, 'Member' from auth.users
on conflict do nothing;

-- ---------------------------------------------------------------- who the public can see
-- Confirmed, unblocked members who are not admins. Unconfirmed sign-ups (which anyone can script)
-- and admin accounts are not listed.
create or replace function public.member_is_public(m uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.member_profiles p
    join auth.users u on u.id = p.id
    where p.id = m and u.email_confirmed_at is not null and not p.blocked
  ) and not exists (select 1 from public.profiles a where a.id = m);
$$;

drop policy "member_profiles: public reads unblocked" on public.member_profiles;
create policy "member_profiles: public reads confirmed members" on public.member_profiles
  for select to anon, authenticated using (public.member_is_public(id));

-- Only a member who is confirmed and not blocked may change their profile.
drop policy "member_profiles: update own" on public.member_profiles;
create policy "member_profiles: update own" on public.member_profiles
  for update to authenticated
  using (id = (select auth.uid()) and public.is_verified_member())
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------- moderation evidence
-- A comment the admin hid stays until the admin shows it again: neither its writer nor the post's
-- author can delete it.
drop policy "blog_comments: author or post author deletes" on public.blog_comments;
create policy "blog_comments: author or post author deletes" on public.blog_comments
  for delete to authenticated
  using (not hidden and (author_id = (select auth.uid()) or public.is_post_author(post_id)));

-- ---------------------------------------------------------------- indexes
create index if not exists blog_comments_author_idx on public.blog_comments (author_id, created_at desc);
create index if not exists blog_likes_user_idx on public.blog_likes (user_id);
create index if not exists blog_posts_author_created_idx on public.blog_posts (author_id, created_at desc);

-- ---------------------------------------------------------------- function privileges
-- Trigger functions are not meant to be called through the API.
revoke all on function
  public.set_updated_at(),
  public.handle_new_member(),
  public.blog_like_counter(),
  public.limit_blog_posts(),
  public.limit_blog_comments(),
  public.milestone_takes_post_tbc(),
  public.post_tbc_to_milestones(),
  public.blog_cover_own_folder()
  from public, anon, authenticated;

-- The name checks run as the member who edits their profile (every update evaluates every check
-- constraint), so the signed-in role must be able to run them. They only look at the text they get.
revoke all on function
  public.clean_display_name(text),
  public.is_reserved_display_name(text),
  public.safe_display_name(text)
  from public, anon;
grant execute on function
  public.clean_display_name(text),
  public.is_reserved_display_name(text),
  public.safe_display_name(text)
  to authenticated;

revoke all on function public.member_is_public(uuid) from public;
grant execute on function public.member_is_public(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
