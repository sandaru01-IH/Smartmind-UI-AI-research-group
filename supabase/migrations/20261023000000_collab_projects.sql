-- Smartmind: the open invitation page. Each project is a row, with the person to contact
-- (name, role, short details, optional email and photo). Add and edit them in the admin: Site content > Open invitation.

create table public.collab_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  summary text not null default '' check (char_length(summary) <= 1500),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  contact_role text not null default '' check (char_length(contact_role) <= 200),
  contact_bio text not null default '' check (char_length(contact_bio) <= 600),
  contact_email text not null default '' check (char_length(contact_email) <= 200),
  contact_photo_path text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger collab_projects_set_updated_at before update on public.collab_projects
  for each row execute function public.set_updated_at();

alter table public.collab_projects enable row level security;

create policy "collab_projects: public reads visible" on public.collab_projects
  for select to anon, authenticated using (visible);
create policy "collab_projects: admin reads all" on public.collab_projects
  for select to authenticated using (public.is_admin());
create policy "collab_projects: admin inserts" on public.collab_projects
  for insert to authenticated with check (public.is_admin());
create policy "collab_projects: admin updates" on public.collab_projects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "collab_projects: admin deletes" on public.collab_projects
  for delete to authenticated using (public.is_admin());
revoke insert, update, delete, truncate on public.collab_projects from anon;
