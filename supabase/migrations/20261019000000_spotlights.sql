-- Smartmind: spotlight projects on the research page (4ONSE was the only one, fixed in code).
create table public.research_spotlights (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  label text not null default '' check (char_length(label) <= 40),
  summary text not null default '' check (char_length(summary) <= 1000),
  points text[] not null default '{}' check (cardinality(points) <= 12),
  note text not null default '' check (char_length(note) <= 1000),
  tbc boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger research_spotlights_set_updated_at before update on public.research_spotlights
  for each row execute function public.set_updated_at();

alter table public.research_spotlights enable row level security;
create policy "research_spotlights: public reads visible" on public.research_spotlights
  for select to anon, authenticated using (visible);
create policy "research_spotlights: admin reads all" on public.research_spotlights
  for select to authenticated using (public.is_admin());
create policy "research_spotlights: admin inserts" on public.research_spotlights
  for insert to authenticated with check (public.is_admin());
create policy "research_spotlights: admin updates" on public.research_spotlights
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "research_spotlights: admin deletes" on public.research_spotlights
  for delete to authenticated using (public.is_admin());
revoke insert, update, delete, truncate on public.research_spotlights from anon;
