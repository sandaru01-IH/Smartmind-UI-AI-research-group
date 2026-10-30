-- Smartmind: the community blog. Anyone may register; registered members write posts, comment and
-- like. Members are NOT admins: they live in member_profiles, never in public.profiles, and nothing
-- here lets a member reach admin data. The admin can only hide posts and comments and block members,
-- through the three admin_set_* functions below. Admins have no general write access to this content.

-- ---------------------------------------------------------------- member_profiles
create table public.member_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  photo_path text,
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger member_profiles_set_updated_at before update on public.member_profiles
  for each row execute function public.set_updated_at();

-- Every new account gets a member profile. The name comes from sign-up, else the email's first part.
create function public.handle_new_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dn text := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
begin
  if char_length(dn) < 2 then dn := left(btrim(split_part(coalesce(new.email, ''), '@', 1)), 80); end if;
  if char_length(dn) < 2 then dn := 'Member'; end if;
  insert into public.member_profiles (id, display_name) values (new.id, dn) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_member
  after insert on auth.users
  for each row execute function public.handle_new_member();

-- Accounts that already exist (the admins) get a profile too.
insert into public.member_profiles (id, display_name)
select u.id,
  case when char_length(left(btrim(split_part(coalesce(u.email, ''), '@', 1)), 80)) >= 2
       then left(btrim(split_part(coalesce(u.email, ''), '@', 1)), 80) else 'Member' end
from auth.users u
on conflict do nothing;

-- ---------------------------------------------------------------- helpers
-- True for a signed-in member whose email is confirmed and who is not blocked.
create function public.is_verified_member() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.member_profiles m
    join auth.users u on u.id = m.id
    where m.id = auth.uid() and u.email_confirmed_at is not null and not m.blocked
  );
$$;

-- True when an author is unknown (account deleted) or not blocked.
create function public.author_ok(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a is null or not exists (select 1 from public.member_profiles m where m.id = a and m.blocked);
$$;

-- ---------------------------------------------------------------- blog_posts
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.member_profiles (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  summary text not null default '' check (char_length(summary) <= 300),
  body_md text not null default '' check (char_length(body_md) <= 50000),
  cover_path text,
  cover_alt text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  hidden boolean not null default false,
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_cover_needs_alt check (cover_path is null or (cover_alt is not null and cover_alt <> '')),
  constraint blog_published_needs_date check (status <> 'published' or published_at is not null)
);

create index blog_posts_live_idx on public.blog_posts (status, published_at desc);
create index blog_posts_author_idx on public.blog_posts (author_id);

create trigger blog_posts_set_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- True when a post is visible to the public.
create function public.post_is_live(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blog_posts p
    where p.id = p_id and p.status = 'published' and p.published_at <= now()
      and not p.hidden and public.author_ok(p.author_id)
  );
$$;

create function public.is_post_author(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blog_posts p where p.id = p_id and p.author_id = auth.uid());
$$;

-- ---------------------------------------------------------------- blog_comments
create table public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  author_id uuid references public.member_profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index blog_comments_post_idx on public.blog_comments (post_id, created_at);

-- ---------------------------------------------------------------- blog_likes
create table public.blog_likes (
  post_id uuid not null references public.blog_posts (id) on delete cascade,
  user_id uuid not null references public.member_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create function public.blog_like_counter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.blog_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  end if;
  update public.blog_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger blog_likes_count after insert or delete on public.blog_likes
  for each row execute function public.blog_like_counter();

-- ---------------------------------------------------------------- rate limits
-- At most 10 posts and 30 comments per member per hour. Enforced here so a hand-made request cannot skip it.
create function public.limit_blog_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.author_id is not null and (
    select count(*) from public.blog_posts where author_id = new.author_id and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'You are posting too fast. Try again later.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger blog_posts_rate_limit before insert on public.blog_posts
  for each row execute function public.limit_blog_posts();

create function public.limit_blog_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.author_id is not null and (
    select count(*) from public.blog_comments where author_id = new.author_id and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'You are commenting too fast. Try again later.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger blog_comments_rate_limit before insert on public.blog_comments
  for each row execute function public.limit_blog_comments();

-- ---------------------------------------------------------------- privileges
-- Start from nothing, then grant exactly what members need. Column grants are what stop a writer
-- changing hidden, like_count or author_id.
revoke all on public.member_profiles, public.blog_posts, public.blog_comments, public.blog_likes
  from anon, authenticated;

grant select (id, display_name, bio, photo_path, created_at) on public.member_profiles to anon;
grant select on public.member_profiles to authenticated;
grant update (display_name, bio, photo_path) on public.member_profiles to authenticated;

grant select on public.blog_posts to anon, authenticated;
grant insert (author_id, title, slug, summary, body_md, cover_path, cover_alt, status, published_at)
  on public.blog_posts to authenticated;
grant update (title, slug, summary, body_md, cover_path, cover_alt, status, published_at)
  on public.blog_posts to authenticated;
grant delete on public.blog_posts to authenticated;

grant select on public.blog_comments to anon, authenticated;
grant insert (post_id, author_id, body) on public.blog_comments to authenticated;
grant delete on public.blog_comments to authenticated;

grant select, insert, delete on public.blog_likes to authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.member_profiles enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_likes enable row level security;

-- member_profiles
create policy "member_profiles: public reads unblocked" on public.member_profiles
  for select to anon, authenticated using (not blocked);
create policy "member_profiles: read own" on public.member_profiles
  for select to authenticated using (id = auth.uid());
create policy "member_profiles: admin reads all" on public.member_profiles
  for select to authenticated using (public.is_admin());
create policy "member_profiles: update own" on public.member_profiles
  for update to authenticated using (id = auth.uid() and not blocked) with check (id = auth.uid());

-- blog_posts
create policy "blog_posts: public reads live" on public.blog_posts
  for select to anon, authenticated
  using (status = 'published' and published_at <= now() and not hidden and public.author_ok(author_id));
create policy "blog_posts: author reads own" on public.blog_posts
  for select to authenticated using (author_id = auth.uid());
create policy "blog_posts: admin reads all" on public.blog_posts
  for select to authenticated using (public.is_admin());
create policy "blog_posts: member inserts own" on public.blog_posts
  for insert to authenticated with check (author_id = auth.uid() and public.is_verified_member());
create policy "blog_posts: member updates own" on public.blog_posts
  for update to authenticated
  using (author_id = auth.uid() and public.is_verified_member())
  with check (author_id = auth.uid() and public.is_verified_member());
create policy "blog_posts: member deletes own" on public.blog_posts
  for delete to authenticated using (author_id = auth.uid() and public.is_verified_member());

-- blog_comments
create policy "blog_comments: public reads live" on public.blog_comments
  for select to anon, authenticated
  using (not hidden and public.author_ok(author_id) and public.post_is_live(post_id));
create policy "blog_comments: author reads own" on public.blog_comments
  for select to authenticated using (author_id = auth.uid());
create policy "blog_comments: admin reads all" on public.blog_comments
  for select to authenticated using (public.is_admin());
create policy "blog_comments: member inserts own" on public.blog_comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_verified_member() and public.post_is_live(post_id));
create policy "blog_comments: author or post author deletes" on public.blog_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_post_author(post_id));

-- blog_likes
create policy "blog_likes: read own" on public.blog_likes
  for select to authenticated using (user_id = auth.uid());
create policy "blog_likes: member likes a live post" on public.blog_likes
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_verified_member() and public.post_is_live(post_id));
create policy "blog_likes: member removes own" on public.blog_likes
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- admin moderation
create function public.admin_set_blog_post_hidden(p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.blog_posts set hidden = p_hidden where id = p_id;
end;
$$;

create function public.admin_set_blog_comment_hidden(p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.blog_comments set hidden = p_hidden where id = p_id;
end;
$$;

create function public.admin_set_member_blocked(p_id uuid, p_blocked boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.member_profiles set blocked = p_blocked where id = p_id;
end;
$$;

-- A member deletes their own account. Their posts and comments stay, with no author ("Former member").
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if public.is_admin() then raise exception 'Admin accounts cannot be deleted here' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function
  public.admin_set_blog_post_hidden(uuid, boolean),
  public.admin_set_blog_comment_hidden(uuid, boolean),
  public.admin_set_member_blocked(uuid, boolean),
  public.delete_my_account(),
  public.is_verified_member(),
  public.author_ok(uuid),
  public.post_is_live(uuid),
  public.is_post_author(uuid)
  from public, anon, authenticated;

grant execute on function
  public.admin_set_blog_post_hidden(uuid, boolean),
  public.admin_set_blog_comment_hidden(uuid, boolean),
  public.admin_set_member_blocked(uuid, boolean),
  public.delete_my_account()
  to authenticated;

-- Policies call these as the signed-in or anonymous role, so those roles must be able to run them.
grant execute on function
  public.is_verified_member(),
  public.author_ok(uuid),
  public.post_is_live(uuid),
  public.is_post_author(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------- storage: members upload into their own folder
create policy "media: member insert own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
    and (storage.foldername(name))[2] = auth.uid()::text and public.is_verified_member()
  );
create policy "media: member update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
    and (storage.foldername(name))[2] = auth.uid()::text and public.is_verified_member()
  )
  with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
    and (storage.foldername(name))[2] = auth.uid()::text and public.is_verified_member()
  );
create policy "media: member delete own folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

notify pgrst, 'reload schema';
