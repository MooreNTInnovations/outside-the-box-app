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

drop policy if exists "room members join public rooms" on public.room_members;
create policy "room members join public rooms"
on public.room_members for insert
to authenticated
with check (user_id = auth.uid() and role = 'member' and public.can_join_public_room(room_id));

drop policy if exists "projects read accessible" on public.projects;
create policy "projects read accessible"
on public.projects for select
to authenticated
using (owner_id = auth.uid() or visibility in ('public', 'discoverable') or public.can_access_project(id));

drop policy if exists "project members join public or discoverable" on public.project_members;
create policy "project members join public or discoverable"
on public.project_members for insert
to authenticated
with check (public.can_insert_project_membership(project_id, user_id, role));
