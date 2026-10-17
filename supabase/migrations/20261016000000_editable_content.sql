-- Smartmind: everything on the public site becomes editable from the admin.
--   * posts get a real "to be confirmed" switch (it used to be a hidden tag) and can also be listed
--     as a publication or an award
--   * awards, publications (papers, posters ...), partners (with logos) and research themes live in tables
--   * people can be linked to any work, so a profile fills itself as work is added
--   * team members get social profile links

-- ------------------------------------------------------------------- posts
alter table public.posts
  add column tbc boolean not null default false,
  add column in_publications boolean not null default false,
  add column in_awards boolean not null default false;

-- The old hidden tag becomes the switch.
update public.posts
  set tbc = true, tags = array_remove(tags, 'to-be-confirmed')
  where 'to-be-confirmed' = any (tags);

-- ------------------------------------------------------------ team: socials
alter table public.team_members
  add column socials jsonb not null default '[]'::jsonb
    check (jsonb_typeof(socials) = 'array' and jsonb_array_length(socials) <= 8);

-- ------------------------------------------------------------------- awards
create table public.awards (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 1900 and 2100),
  when_label text not null default '' check (char_length(when_label) <= 60),
  award text not null check (char_length(award) between 2 and 200),
  who text not null default '' check (char_length(who) <= 200),
  event text not null default '' check (char_length(event) <= 300),
  reason text not null default '' check (char_length(reason) <= 300),
  tbc boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------- publications
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'paper' check (kind in ('paper', 'poster', 'report', 'talk', 'other')),
  year integer not null check (year between 1900 and 2100),
  title text not null check (char_length(title) between 3 and 400),
  venue text not null default '' check (char_length(venue) <= 300),
  href text check (href is null or href ~* '^https?://'),
  authors text not null default '' check (char_length(authors) <= 400),
  tbc boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- partners
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  short text not null default '' check (char_length(short) <= 24),
  kind text not null default 'national' check (kind in ('national', 'international')),
  place text not null default '' check (char_length(place) <= 80),
  url text check (url is null or url ~* '^https?://'),
  logo_path text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- research
create table public.research_themes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  style text not null default 'land' check (style in ('land', 'flood', 'traffic', 'ai')),
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.research_themes (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 300),
  src_funded boolean not null default false,
  sort_order integer not null default 0
);
create index research_projects_theme_idx on public.research_projects (theme_id, sort_order);

create table public.research_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  sort_order integer not null default 0
);

-- ------------------------------------------------------------------- people
-- Exactly one of post / publication / award per row.
create table public.work_people (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  publication_id uuid references public.publications (id) on delete cascade,
  award_id uuid references public.awards (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint work_people_one_target check (num_nonnulls(post_id, publication_id, award_id) = 1)
);
create unique index work_people_post_idx on public.work_people (member_id, post_id) where post_id is not null;
create unique index work_people_pub_idx on public.work_people (member_id, publication_id) where publication_id is not null;
create unique index work_people_award_idx on public.work_people (member_id, award_id) where award_id is not null;
create index work_people_post_lookup on public.work_people (post_id) where post_id is not null;
create index work_people_pub_lookup on public.work_people (publication_id) where publication_id is not null;
create index work_people_award_lookup on public.work_people (award_id) where award_id is not null;

-- ----------------------------------------------------------- updated_at, RLS
create trigger awards_set_updated_at before update on public.awards
  for each row execute function public.set_updated_at();
create trigger publications_set_updated_at before update on public.publications
  for each row execute function public.set_updated_at();
create trigger partners_set_updated_at before update on public.partners
  for each row execute function public.set_updated_at();
create trigger research_themes_set_updated_at before update on public.research_themes
  for each row execute function public.set_updated_at();

alter table public.awards enable row level security;
alter table public.publications enable row level security;
alter table public.partners enable row level security;
alter table public.research_themes enable row level security;
alter table public.research_projects enable row level security;
alter table public.research_topics enable row level security;
alter table public.work_people enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['awards', 'publications', 'partners', 'research_themes'] loop
    execute format('create policy "%1$s: public reads visible" on public.%1$s for select to anon, authenticated using (visible)', t);
    execute format('create policy "%1$s: admin reads all" on public.%1$s for select to authenticated using (public.is_admin())', t);
  end loop;
  foreach t in array array['awards', 'publications', 'partners', 'research_themes', 'research_projects', 'research_topics', 'work_people'] loop
    execute format('create policy "%1$s: admin inserts" on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s: admin updates" on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "%1$s: admin deletes" on public.%1$s for delete to authenticated using (public.is_admin())', t);
    execute format('revoke insert, update, delete, truncate on public.%1$s from anon', t);
  end loop;
end $$;

-- Projects and topics are public along with their theme; a hidden theme hides its projects.
create policy "research_projects: public reads" on public.research_projects
  for select to anon, authenticated
  using (exists (select 1 from public.research_themes t where t.id = theme_id));
create policy "research_projects: admin reads all" on public.research_projects
  for select to authenticated using (public.is_admin());
create policy "research_topics: public reads" on public.research_topics
  for select to anon, authenticated using (true);

-- A link is public only when the work it points at is public: the sub-selects run under the caller's
-- own policies, so drafts, scheduled posts and hidden rows never leak through this table.
create policy "work_people: public reads" on public.work_people
  for select to anon, authenticated
  using (
    exists (select 1 from public.team_members m where m.id = member_id)
    and (
      (post_id is not null and exists (select 1 from public.posts p where p.id = post_id))
      or (publication_id is not null and exists (select 1 from public.publications x where x.id = publication_id))
      or (award_id is not null and exists (select 1 from public.awards a where a.id = award_id))
    )
  );
create policy "work_people: admin reads all" on public.work_people
  for select to authenticated using (public.is_admin());
