alter table public.files
add column if not exists storage_path text,
add column if not exists mime_type text,
add column if not exists size_bytes bigint;

update public.files
set storage_path = object_path
where storage_path is null;

alter table public.files
drop constraint if exists files_size_bytes_check;

alter table public.files
add constraint files_size_bytes_check
check (size_bytes is null or size_bytes >= 0);

create or replace function public.sync_file_storage_path()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.storage_path is null and new.object_path is not null then
    new.storage_path = new.object_path;
  end if;

  if new.object_path is null and new.storage_path is not null then
    new.object_path = new.storage_path;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_file_storage_path on public.files;
create trigger sync_file_storage_path
before insert or update on public.files
for each row execute function public.sync_file_storage_path();

insert into storage.buckets (id, name, public)
values ('collaboration-files', 'collaboration-files', false)
on conflict (id) do nothing;

drop policy if exists "collaboration files read authenticated" on storage.objects;
create policy "collaboration files read authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'collaboration-files');

drop policy if exists "collaboration files upload authenticated" on storage.objects;
create policy "collaboration files upload authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'collaboration-files');
