-- A timeline entry tied to a post must follow the post's "to be confirmed" switch even while the post
-- is still a draft (visitors cannot read drafts, so the public page cannot look the post up itself).
-- The database copies the switch across whenever either side changes.

create function public.milestone_takes_post_tbc() returns trigger
language plpgsql as $$
begin
  if new.post_id is not null then
    new.tbc = coalesce((select p.tbc from public.posts p where p.id = new.post_id), new.tbc);
  end if;
  return new;
end;
$$;

create trigger milestones_follow_post
  before insert or update of post_id on public.milestones
  for each row execute function public.milestone_takes_post_tbc();

create function public.post_tbc_to_milestones() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.milestones set tbc = new.tbc where post_id = new.id and tbc is distinct from new.tbc;
  return new;
end;
$$;

create trigger posts_tbc_to_milestones
  after update of tbc on public.posts
  for each row execute function public.post_tbc_to_milestones();

-- Bring everything already in the database in line.
update public.milestones m set tbc = p.tbc from public.posts p
  where m.post_id = p.id and m.tbc is distinct from p.tbc;
