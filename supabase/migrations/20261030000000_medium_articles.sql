-- Smartmind: Medium articles. Each row links out to an article on Medium, with a cover, summary and
-- author. Add and edit them in the admin: Site content > Medium articles.

create table public.medium_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  url text not null check (url ~* '^https://' and char_length(url) <= 2048),
  summary text not null default '' check (char_length(summary) <= 400),
  cover_path text,
  cover_alt text,
  author_name text not null default '' check (char_length(author_name) <= 120),
  published_on date,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medium_cover_needs_alt check (cover_path is null or (cover_alt is not null and cover_alt <> ''))
);

create trigger medium_articles_set_updated_at before update on public.medium_articles
  for each row execute function public.set_updated_at();

alter table public.medium_articles enable row level security;

create policy "medium_articles: public reads visible" on public.medium_articles
  for select to anon, authenticated using (visible);
create policy "medium_articles: admin reads all" on public.medium_articles
  for select to authenticated using (public.is_admin());
create policy "medium_articles: admin inserts" on public.medium_articles
  for insert to authenticated with check (public.is_admin());
create policy "medium_articles: admin updates" on public.medium_articles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "medium_articles: admin deletes" on public.medium_articles
  for delete to authenticated using (public.is_admin());
revoke insert, update, delete, truncate on public.medium_articles from anon;

notify pgrst, 'reload schema';
