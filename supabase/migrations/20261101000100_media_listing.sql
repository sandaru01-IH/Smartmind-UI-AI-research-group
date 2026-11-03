-- Smartmind: the media bucket can no longer be listed by visitors (auth audit, DB finding F-05).
-- The bucket is public, so a file's address keeps working without any SELECT policy. That policy
-- only added the list/search API, which showed every file name to anyone: covers of drafts and
-- scheduled posts, and the folder of every member who ever uploaded something.
--
-- Listing now needs an account that has a reason to see names: the admin sees all, and a member sees
-- their own folder (which is also what replacing a file with `upsert` and the server's download and
-- remove steps need, because they run as the signed-in user).

drop policy "media: public read" on storage.objects;

create policy "media: admin lists" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and public.is_admin());

create policy "media: member lists own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media' and (storage.foldername(name))[1] = 'members'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
