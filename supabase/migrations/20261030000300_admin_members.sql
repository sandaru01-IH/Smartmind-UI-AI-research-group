-- Smartmind: lets the admin see who the community members are (name and email) so they can spot a
-- spammer and block the account. Email addresses live in auth.users, which the API never exposes, so
-- this read-only function is the only way, and only an admin may call it.

create function public.admin_list_members()
returns table (id uuid, email text, display_name text, blocked boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  return query
    select m.id, u.email::text, m.display_name, m.blocked, m.created_at
    from public.member_profiles m
    join auth.users u on u.id = m.id
    order by m.created_at desc;
end;
$$;

revoke all on function public.admin_list_members() from public, anon, authenticated;
grant execute on function public.admin_list_members() to authenticated;

notify pgrst, 'reload schema';
