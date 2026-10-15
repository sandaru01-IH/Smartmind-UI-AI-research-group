-- Smartmind: gallery moments, news/ticker placement, configurable team network.

-- ------------------------------------------------------------- posts: placement
alter table public.posts
  add column show_in_news boolean not null default true,
  add column show_in_ticker boolean not null default false,
  add column in_gallery boolean not null default false,
  add column video_url text check (video_url is null or video_url ~* '^https://'),
  add column gallery_paths text[] not null default '{}' check (cardinality(gallery_paths) <= 12),
  add column external_links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(external_links) = 'array' and jsonb_array_length(external_links) <= 6);

-- Existing short updates keep rolling in the ticker; they never were news cards.
update public.posts set show_in_ticker = true, show_in_news = false where type = 'update';

create index posts_gallery_idx on public.posts (in_gallery) where in_gallery;
create index posts_ticker_idx on public.posts (show_in_ticker) where show_in_ticker;

-- ------------------------------------------------------------------ team network
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 2 and 120),
  role text not null default '' check (char_length(role) <= 160),
  group_label text not null default '' check (char_length(group_label) <= 40),
  affiliation text not null default '' check (char_length(affiliation) <= 160),
  education text not null default '' check (char_length(education) <= 400),
  qualifications text not null default '' check (char_length(qualifications) <= 400),
  papers integer check (papers is null or papers between 0 and 2000),
  contribution text not null default '' check (char_length(contribution) <= 800),
  photo_path text,
  photo_alt text,
  profile_url text check (profile_url is null or profile_url ~* '^https?://'),
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_links (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.team_members (id) on delete cascade,
  b uuid not null references public.team_members (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 80),
  created_at timestamptz not null default now(),
  constraint team_links_distinct check (a <> b)
);
-- One link per unordered pair.
create unique index team_links_pair_idx
  on public.team_links (least(a, b), greatest(a, b));

create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.set_updated_at();

alter table public.team_members enable row level security;
alter table public.team_links enable row level security;

create policy "team_members: public reads visible" on public.team_members
  for select to anon, authenticated using (visible);
create policy "team_members: admin reads all" on public.team_members
  for select to authenticated using (public.is_admin());
create policy "team_members: admin inserts" on public.team_members
  for insert to authenticated with check (public.is_admin());
create policy "team_members: admin updates" on public.team_members
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "team_members: admin deletes" on public.team_members
  for delete to authenticated using (public.is_admin());

create policy "team_links: public reads" on public.team_links
  for select to anon, authenticated using (true);
create policy "team_links: admin inserts" on public.team_links
  for insert to authenticated with check (public.is_admin());
create policy "team_links: admin updates" on public.team_links
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "team_links: admin deletes" on public.team_links
  for delete to authenticated using (public.is_admin());

revoke insert, update, delete, truncate on public.team_members from anon;
revoke insert, update, delete, truncate on public.team_links from anon;
