create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.log_admin_action(
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_actions (actor_id, action_type, target_type, target_id, notes)
  values (auth.uid(), p_action_type, p_target_type, p_target_id, p_notes);
end;
$$;

create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required.';
  end if;
end;
$$;

create or replace function public.require_moderator_or_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Moderator or admin role required.';
  end if;
end;
$$;

create or replace function public.admin_set_profile_role(target_user_id uuid, next_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  if next_role not in ('member', 'moderator', 'admin') then
    raise exception 'Invalid role.';
  end if;

  update public.profiles
  set role = next_role,
      updated_at = now()
  where id = target_user_id;

  perform public.log_admin_action('update_role', 'profile', target_user_id, 'Set role to ' || next_role);
end;
$$;

create or replace function public.admin_update_report_status(target_report_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_moderator_or_admin();

  if next_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'Invalid report status.';
  end if;

  update public.reports
  set status = next_status
  where id = target_report_id;

  perform public.log_admin_action('update_report_status', 'report', target_report_id, 'Set status to ' || next_status);
end;
$$;

create or replace function public.admin_create_room(
  new_room_key text,
  new_name text,
  new_description text,
  new_is_public boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_room_id uuid;
begin
  perform public.require_admin();

  insert into public.rooms (room_key, name, description, is_system, is_public)
  values (new_room_key, new_name, new_description, false, new_is_public)
  returning id into created_room_id;

  perform public.log_admin_action('create_room', 'room', created_room_id, 'Created room ' || new_name);
  return created_room_id;
end;
$$;

create or replace function public.admin_update_room(
  target_room_id uuid,
  next_name text,
  next_description text,
  next_is_public boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  update public.rooms
  set name = next_name,
      description = next_description,
      is_public = next_is_public
  where id = target_room_id;

  perform public.log_admin_action('update_room', 'room', target_room_id, 'Updated room settings');
end;
$$;

create or replace function public.admin_update_project(
  target_project_id uuid,
  next_name text,
  next_summary text,
  next_visibility text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  if next_visibility not in ('private', 'discoverable', 'public') then
    raise exception 'Invalid project visibility.';
  end if;

  update public.projects
  set name = next_name,
      summary = next_summary,
      visibility = next_visibility,
      updated_at = now()
  where id = target_project_id;

  perform public.log_admin_action('update_project', 'project', target_project_id, 'Updated project settings');
end;
$$;

create or replace function public.admin_delete_record(
  target_type text,
  target_id uuid,
  action_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  perform public.log_admin_action('delete', target_type, target_id, action_notes);

  if target_type = 'message' then
    delete from public.messages where id = target_id;
  elsif target_type = 'project' then
    delete from public.projects where id = target_id;
  elsif target_type = 'room' then
    delete from public.rooms where id = target_id and is_system = false;
  elsif target_type = 'file' then
    delete from public.files where id = target_id;
  elsif target_type = 'report' then
    delete from public.reports where id = target_id;
  else
    raise exception 'Unsupported delete target type.';
  end if;
end;
$$;

create or replace function public.admin_remove_room_membership(
  target_room_id uuid,
  target_user_id uuid,
  action_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  perform public.log_admin_action('remove_room_membership', 'room', target_room_id, action_notes);

  delete from public.room_members
  where room_id = target_room_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.admin_remove_project_membership(
  target_project_id uuid,
  target_user_id uuid,
  action_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  perform public.log_admin_action('remove_project_membership', 'project', target_project_id, action_notes);

  delete from public.project_members
  where project_id = target_project_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Role changes require admin privileges.';
  end if;

  return new;
end;
$$;

drop policy if exists "rooms read moderators" on public.rooms;
create policy "rooms read moderators"
on public.rooms for select
to authenticated
using (public.is_moderator_or_admin());

drop policy if exists "messages read moderators" on public.messages;
create policy "messages read moderators"
on public.messages for select
to authenticated
using (public.is_moderator_or_admin());

drop policy if exists "projects read moderators" on public.projects;
create policy "projects read moderators"
on public.projects for select
to authenticated
using (public.is_moderator_or_admin());

drop policy if exists "project members read moderators" on public.project_members;
create policy "project members read moderators"
on public.project_members for select
to authenticated
using (public.is_moderator_or_admin());

drop policy if exists "files read moderators" on public.files;
create policy "files read moderators"
on public.files for select
to authenticated
using (public.is_moderator_or_admin());
