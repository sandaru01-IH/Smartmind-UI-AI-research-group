-- A blocked member must not be able to undo their block by deleting their account. Deleting an account
-- leaves their posts and comments behind with no author, and content with no author counts as
-- "Former member" and is public. So when a blocked member deletes their account, everything they wrote
-- is hidden first, and stays hidden.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if public.is_admin() then raise exception 'Admin accounts cannot be deleted here' using errcode = '42501'; end if;
  if exists (select 1 from public.member_profiles m where m.id = auth.uid() and m.blocked) then
    update public.blog_posts set hidden = true where author_id = auth.uid();
    update public.blog_comments set hidden = true where author_id = auth.uid();
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

notify pgrst, 'reload schema';
