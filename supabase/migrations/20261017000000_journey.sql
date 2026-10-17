-- Smartmind: the chatbot journey timeline becomes editable. An entry can be tied to a news post, and
-- then it follows that post's "to be confirmed" switch, so one change shows everywhere.

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  year text not null check (char_length(year) between 1 and 10),
  when_label text not null default '' check (char_length(when_label) <= 80),
  title text not null check (char_length(title) between 2 and 200),
  detail text not null default '' check (char_length(detail) <= 2000),
  links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 6),
  tbc boolean not null default false,
  post_id uuid references public.posts (id) on delete set null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

alter table public.milestones enable row level security;
create policy "milestones: public reads visible" on public.milestones
  for select to anon, authenticated using (visible);
create policy "milestones: admin reads all" on public.milestones
  for select to authenticated using (public.is_admin());
create policy "milestones: admin inserts" on public.milestones
  for insert to authenticated with check (public.is_admin());
create policy "milestones: admin updates" on public.milestones
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "milestones: admin deletes" on public.milestones
  for delete to authenticated using (public.is_admin());
revoke insert, update, delete, truncate on public.milestones from anon;
