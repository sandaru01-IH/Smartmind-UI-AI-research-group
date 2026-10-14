-- Smartmind: profiles, posts, storage bucket and Row Level Security.
-- Visibility rule (also in lib/visibility.ts): status = 'published' AND published_at <= now().

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('article', 'update')),
  title text not null check (char_length(title) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  body_md text not null default '' check (char_length(body_md) <= 50000),
  category text not null check (
    category in ('News', 'Event', 'Research', 'Chatbot', 'Award', 'Publication', 'Partnership')
  ),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  cover_path text,
  cover_alt text,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  event_date date,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint update_headline_length check (type <> 'update' or char_length(title) <= 140),
  constraint cover_needs_alt check (cover_path is null or (cover_alt is not null and cover_alt <> '')),
  constraint published_needs_date check (status <> 'published' or published_at is not null)
);

create index posts_status_idx on public.posts (status);
create index posts_published_at_idx on public.posts (published_at desc);
create index posts_slug_idx on public.posts (slug);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------- helpers
-- Security definer so policies can consult profiles without exposing it.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- profiles: a signed-in user may read only their own row. No client writes at all.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

-- posts: anyone sees live posts only.
create policy "posts: public reads live" on public.posts
  for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());

-- posts: admins see and change everything.
create policy "posts: admin reads all" on public.posts
  for select to authenticated using (public.is_admin());
create policy "posts: admin inserts" on public.posts
  for insert to authenticated with check (public.is_admin());
create policy "posts: admin updates" on public.posts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "posts: admin deletes" on public.posts
  for delete to authenticated using (public.is_admin());

-- Belt and braces: anon never gets write privileges, and profiles are closed to anon.
revoke insert, update, delete, truncate on public.posts from anon;
revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;

-- ------------------------------------------------------------------ storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');
create policy "media: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());
create policy "media: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());
