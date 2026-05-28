insert into storage.buckets (id, name, public, file_size_limit)
values ('collaboration-files', 'collaboration-files', false, 262144000)
on conflict (id) do update
set public = false,
    file_size_limit = 262144000;

drop policy if exists "collaboration files read authenticated" on storage.objects;
drop policy if exists "collaboration files read permitted" on storage.objects;

create policy "collaboration files read permitted"
on storage.objects for select
to authenticated
using (
  bucket_id = 'collaboration-files'
  and exists (
    select 1
    from public.files
    where files.bucket_id = 'collaboration-files'
      and (files.storage_path = storage.objects.name or files.object_path = storage.objects.name)
      and (
        files.owner_id = auth.uid()
        or public.is_admin()
        or (files.room_id is not null and public.can_access_room(files.room_id))
        or (files.project_id is not null and public.can_access_project(files.project_id))
      )
  )
);
