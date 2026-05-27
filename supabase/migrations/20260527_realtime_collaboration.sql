alter table public.profiles
add column if not exists expertise_tags text[] not null default '{}';

create or replace function public.can_join_public_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms
    where id = target_room_id
      and is_public = true
  );
$$;

create or replace function public.can_access_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = target_project_id
      and (
        visibility in ('public', 'discoverable')
        or owner_id = auth.uid()
      )
  )
  or exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_insert_project_membership(
  target_project_id uuid,
  target_user_id uuid,
  target_role text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    and (
      (
        target_role = 'member'
        and exists (
          select 1
          from public.projects
          where id = target_project_id
            and visibility in ('public', 'discoverable')
        )
      )
      or (
        target_role = 'owner'
        and exists (
          select 1
          from public.projects
          where id = target_project_id
            and owner_id = auth.uid()
        )
      )
    );
$$;

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
    with check (user_id = auth.uid() and role = 'member' and public.can_join_public_room(room_id));
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
    with check (public.can_insert_project_membership(project_id, user_id, role));
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
