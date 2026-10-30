-- Smartmind: switches for the optional home page sections. The admin turns "Our latest video",
-- "Latest on Medium" and "Latest from the community" on or off. A section with nothing to show is
-- hidden by the site whatever its switch says.

create table public.home_sections (
  id text primary key check (id in ('video', 'medium', 'blog')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.home_sections (id) values ('video'), ('medium'), ('blog');

create trigger home_sections_set_updated_at before update on public.home_sections
  for each row execute function public.set_updated_at();

alter table public.home_sections enable row level security;

create policy "home_sections: public reads" on public.home_sections
  for select to anon, authenticated using (true);
create policy "home_sections: admin updates" on public.home_sections
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete, truncate on public.home_sections from anon, authenticated;
revoke update on public.home_sections from anon;

notify pgrst, 'reload schema';
