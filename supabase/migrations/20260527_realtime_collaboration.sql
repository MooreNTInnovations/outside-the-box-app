alter table public.profiles
add column if not exists expertise_tags text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'room_members'
      and policyname = 'room members join public rooms'
  ) then
    create policy "room members join public rooms"
    on public.room_members for insert
    to authenticated
    with check (
      user_id = auth.uid()
      and exists (
        select 1 from public.rooms
        where id = room_id
          and is_public = true
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_members'
      and policyname = 'project members join public or discoverable'
  ) then
    create policy "project members join public or discoverable"
    on public.project_members for insert
    to authenticated
    with check (
      (
        user_id = auth.uid()
        and exists (
          select 1 from public.projects
          where id = project_id
            and visibility in ('public', 'discoverable')
        )
      )
      or exists (
        select 1 from public.projects
        where id = project_id
          and owner_id = auth.uid()
          and user_id = auth.uid()
          and role = 'owner'
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'project_members'
      and policyname = 'project members leave own membership'
  ) then
    create policy "project members leave own membership"
    on public.project_members for delete
    to authenticated
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'files'
      and policyname = 'files update own metadata'
  ) then
    create policy "files update own metadata"
    on public.files for update
    to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.project_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.files;
exception
  when duplicate_object then null;
end $$;
