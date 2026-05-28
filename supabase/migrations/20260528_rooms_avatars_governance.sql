create extension if not exists pgcrypto;

alter table public.profiles
add column if not exists avatar_path text,
add column if not exists suspended_at timestamptz;

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('member', 'verified_professional', 'moderator', 'admin'));

alter table public.rooms
add column if not exists owner_id uuid references public.profiles(id) on delete set null,
add column if not exists visibility text,
add column if not exists archived_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

update public.rooms
set visibility = case when is_public then 'public' else 'private' end
where visibility is null;

alter table public.rooms
alter column visibility set default 'private';

alter table public.rooms
drop constraint if exists rooms_visibility_check;

alter table public.rooms
add constraint rooms_visibility_check
check (visibility in ('public', 'private'));

alter table public.room_members
add column if not exists invited_by uuid references public.profiles(id) on delete set null,
add column if not exists status text not null default 'active';

alter table public.room_members
drop constraint if exists room_members_role_check;

alter table public.room_members
add constraint room_members_role_check
check (role in ('member', 'moderator', 'owner'));

alter table public.room_members
drop constraint if exists room_members_status_check;

alter table public.room_members
add constraint room_members_status_check
check (status in ('invited', 'active', 'removed'));

alter table public.messages
add column if not exists content text;

update public.messages
set content = body
where content is null;

alter table public.reports
add column if not exists room_id uuid references public.rooms(id) on delete set null,
add column if not exists project_id uuid references public.projects(id) on delete set null,
add column if not exists updated_at timestamptz not null default now();

alter table public.reports
drop constraint if exists reports_target_type_check;

alter table public.reports
add constraint reports_target_type_check
check (target_type in ('message', 'room', 'project', 'file', 'profile', 'user'));

alter table public.reports
drop constraint if exists reports_status_check;

update public.reports
set status = 'reviewed'
where status = 'reviewing';

alter table public.reports
add constraint reports_status_check
check (status in ('open', 'reviewed', 'resolved', 'dismissed'));

alter table public.admin_actions
add column if not exists target_user_id uuid references public.profiles(id) on delete set null,
add column if not exists details jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() in ('moderator', 'admin');
$$;

create or replace function public.is_admin_moderator_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rooms
    where id = target_room_id
      and room_key = 'admin-moderator-channel'
      and is_system = true
  );
$$;

create or replace function public.can_access_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin()
  or (
    public.is_admin_moderator_room(target_room_id)
    and public.is_moderator_or_admin()
  )
  or exists (
    select 1
    from public.rooms
    where id = target_room_id
      and visibility = 'public'
      and is_public = true
      and archived_at is null
  )
  or exists (
    select 1
    from public.room_members
    where room_id = target_room_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.can_manage_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.rooms
    where id = target_room_id
      and owner_id = auth.uid()
      and is_system = false
  )
  or exists (
    select 1
    from public.room_members
    where room_id = target_room_id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

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
      and visibility = 'public'
      and is_public = true
      and archived_at is null
  );
$$;

create or replace function public.sync_message_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.body is null and new.content is not null then
    new.body = new.content;
  end if;

  if new.content is null and new.body is not null then
    new.content = new.body;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_message_content on public.messages;
create trigger sync_message_content
before insert or update on public.messages
for each row execute function public.sync_message_content();

create or replace function public.log_admin_action(
  p_action_type text,
  p_target_type text,
  p_target_id uuid default null,
  p_notes text default null,
  p_target_user_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_actions (
    actor_id,
    target_user_id,
    action_type,
    target_type,
    target_id,
    notes,
    details
  )
  values (
    auth.uid(),
    p_target_user_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_notes,
    coalesce(p_details, '{}'::jsonb)
  );
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

create or replace function public.create_member_room(
  new_name text,
  new_description text,
  new_visibility text,
  invited_user_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_room_id uuid;
  created_room_key text;
  invited_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if new_visibility not in ('public', 'private') then
    raise exception 'Invalid room visibility.';
  end if;

  created_room_key := lower(regexp_replace(coalesce(new_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  created_room_key := trim(both '-' from created_room_key);
  if created_room_key = '' then
    created_room_key := 'room';
  end if;
  created_room_key := created_room_key || '-' || substr(gen_random_uuid()::text, 1, 8);

  insert into public.rooms (
    room_key,
    name,
    description,
    is_system,
    is_public,
    visibility,
    owner_id
  )
  values (
    created_room_key,
    new_name,
    nullif(new_description, ''),
    false,
    new_visibility = 'public',
    new_visibility,
    auth.uid()
  )
  returning id into created_room_id;

  insert into public.room_members (room_id, user_id, role, status, invited_by)
  values (created_room_id, auth.uid(), 'owner', 'active', auth.uid());

  if new_visibility = 'private' then
    foreach invited_user_id in array coalesce(invited_user_ids, '{}') loop
      if invited_user_id <> auth.uid() then
        insert into public.room_members (room_id, user_id, role, status, invited_by)
        values (created_room_id, invited_user_id, 'member', 'active', auth.uid())
        on conflict (room_id, user_id) do update
        set status = 'active',
            invited_by = excluded.invited_by;
      end if;
    end loop;
  end if;

  return created_room_id;
end;
$$;

create or replace function public.update_owned_room(
  target_room_id uuid,
  next_name text,
  next_description text,
  next_visibility text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_room(target_room_id) then
    raise exception 'Room owner or admin role required.';
  end if;

  if next_visibility not in ('public', 'private') then
    raise exception 'Invalid room visibility.';
  end if;

  update public.rooms
  set name = next_name,
      description = nullif(next_description, ''),
      visibility = next_visibility,
      is_public = next_visibility = 'public',
      updated_at = now()
  where id = target_room_id
    and is_system = false;

  perform public.log_admin_action('update_room', 'room', target_room_id, 'Room settings updated');
end;
$$;

create or replace function public.invite_room_members(
  target_room_id uuid,
  invited_user_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_user_id uuid;
begin
  if not public.can_manage_room(target_room_id) then
    raise exception 'Room owner or admin role required.';
  end if;

  foreach invited_user_id in array coalesce(invited_user_ids, '{}') loop
    insert into public.room_members (room_id, user_id, role, status, invited_by)
    values (target_room_id, invited_user_id, 'member', 'active', auth.uid())
    on conflict (room_id, user_id) do update
    set status = 'active',
        invited_by = excluded.invited_by;
  end loop;

  perform public.log_admin_action(
    'invite_room_members',
    'room',
    target_room_id,
    'Invited room members',
    null,
    jsonb_build_object('invited_user_ids', invited_user_ids)
  );
end;
$$;

create or replace function public.remove_room_member(
  target_room_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_room(target_room_id) then
    raise exception 'Room owner or admin role required.';
  end if;

  if exists (
    select 1
    from public.rooms
    where id = target_room_id
      and owner_id = target_user_id
  ) then
    raise exception 'Room owners cannot be removed until ownership transfer is available.';
  end if;

  delete from public.room_members
  where room_id = target_room_id
    and user_id = target_user_id;

  perform public.log_admin_action('remove_room_member', 'room', target_room_id, null, target_user_id);
end;
$$;

create or replace function public.leave_room(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.rooms
    where id = target_room_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Room owners cannot leave until ownership transfer is available.';
  end if;

  delete from public.room_members
  where room_id = target_room_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.archive_owned_room(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_room(target_room_id) then
    raise exception 'Room owner or admin role required.';
  end if;

  update public.rooms
  set archived_at = now(),
      updated_at = now()
  where id = target_room_id
    and is_system = false;

  perform public.log_admin_action('archive_room', 'room', target_room_id, 'Room archived');
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

  if next_role not in ('member', 'verified_professional', 'moderator', 'admin') then
    raise exception 'Invalid role.';
  end if;

  update public.profiles
  set role = next_role,
      updated_at = now()
  where id = target_user_id;

  perform public.log_admin_action('update_role', 'profile', target_user_id, 'Set role to ' || next_role, target_user_id);
end;
$$;

create or replace function public.admin_set_profile_suspension(target_user_id uuid, should_suspend boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  update public.profiles
  set suspended_at = case when should_suspend then now() else null end,
      updated_at = now()
  where id = target_user_id;

  perform public.log_admin_action(
    case when should_suspend then 'suspend_profile' else 'reactivate_profile' end,
    'profile',
    target_user_id,
    null,
    target_user_id
  );
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

  if next_status not in ('open', 'reviewed', 'resolved', 'dismissed') then
    raise exception 'Invalid report status.';
  end if;

  if not public.is_admin() and next_status in ('resolved', 'dismissed') then
    raise exception 'Admin role required to resolve or dismiss reports.';
  end if;

  update public.reports
  set status = next_status,
      updated_at = now()
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

  insert into public.rooms (room_key, name, description, is_system, is_public, visibility, owner_id)
  values (new_room_key, new_name, new_description, false, new_is_public, case when new_is_public then 'public' else 'private' end, auth.uid())
  returning id into created_room_id;

  insert into public.room_members (room_id, user_id, role, status, invited_by)
  values (created_room_id, auth.uid(), 'owner', 'active', auth.uid())
  on conflict (room_id, user_id) do nothing;

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
      is_public = next_is_public,
      visibility = case when next_is_public then 'public' else 'private' end,
      updated_at = now()
  where id = target_room_id;

  perform public.log_admin_action('update_room', 'room', target_room_id, 'Updated room settings');
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

  if new.suspended_at is distinct from old.suspended_at and not public.is_admin() then
    raise exception 'Suspension changes require admin privileges.';
  end if;

  return new;
end;
$$;

drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read project collaborators" on public.profiles;
drop policy if exists "profiles read authenticated directory" on public.profiles;
create policy "profiles read authenticated directory"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles update own safe fields" on public.profiles;
create policy "profiles update own safe fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "rooms read public system" on public.rooms;
drop policy if exists "rooms read moderators" on public.rooms;
drop policy if exists "rooms read accessible" on public.rooms;
create policy "rooms read accessible"
on public.rooms for select
to authenticated
using (public.can_access_room(id));

drop policy if exists "rooms insert own" on public.rooms;
create policy "rooms insert own"
on public.rooms for insert
to authenticated
with check (owner_id = auth.uid() and is_system = false);

drop policy if exists "rooms update owner admin" on public.rooms;
create policy "rooms update owner admin"
on public.rooms for update
to authenticated
using (public.can_manage_room(id))
with check (public.can_manage_room(id));

drop policy if exists "room members read own rooms" on public.room_members;
drop policy if exists "room members read accessible" on public.room_members;
create policy "room members read accessible"
on public.room_members for select
to authenticated
using (public.can_access_room(room_id) or public.can_manage_room(room_id));

drop policy if exists "room members join public rooms" on public.room_members;
create policy "room members join public rooms"
on public.room_members for insert
to authenticated
with check (
  (
    user_id = auth.uid()
    and role = 'member'
    and status = 'active'
    and public.can_join_public_room(room_id)
  )
  or (
    user_id = auth.uid()
    and role = 'owner'
    and status = 'active'
    and exists (
      select 1
      from public.rooms
      where id = room_id
        and owner_id = auth.uid()
    )
  )
  or public.can_manage_room(room_id)
);

drop policy if exists "room members delete owner self admin" on public.room_members;
create policy "room members delete owner self admin"
on public.room_members for delete
to authenticated
using (
  public.can_manage_room(room_id)
  or (user_id = auth.uid() and role <> 'owner')
);

drop policy if exists "messages read accessible rooms" on public.messages;
drop policy if exists "messages read moderators" on public.messages;
drop policy if exists "messages read accessible rooms governance" on public.messages;
create policy "messages read accessible rooms governance"
on public.messages for select
to authenticated
using (
  (room_id is not null and public.can_access_room(room_id))
  or (project_id is not null and public.can_collaborate_on_project(project_id))
);

drop policy if exists "messages insert as self" on public.messages;
drop policy if exists "messages insert allowed rooms governance" on public.messages;
create policy "messages insert allowed rooms governance"
on public.messages for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    (room_id is not null and public.can_access_room(room_id))
    or (project_id is not null and public.can_collaborate_on_project(project_id))
  )
);

drop policy if exists "messages delete admin" on public.messages;
create policy "messages delete admin"
on public.messages for delete
to authenticated
using (public.is_admin());

drop policy if exists "projects read moderators" on public.projects;
drop policy if exists "project members read moderators" on public.project_members;
drop policy if exists "files read moderators" on public.files;

drop policy if exists "projects read admin" on public.projects;
create policy "projects read admin"
on public.projects for select
to authenticated
using (public.is_admin());

drop policy if exists "project members read admin" on public.project_members;
create policy "project members read admin"
on public.project_members for select
to authenticated
using (public.is_admin());

drop policy if exists "files read admin" on public.files;
create policy "files read admin"
on public.files for select
to authenticated
using (public.is_admin());

drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own"
on public.reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and (
    room_id is null
    or public.can_access_room(room_id)
  )
  and (
    project_id is null
    or public.can_access_project(project_id)
  )
);

drop policy if exists "reports read moderators" on public.reports;
drop policy if exists "reports read governance" on public.reports;
create policy "reports read governance"
on public.reports for select
to authenticated
using (
  public.is_admin()
  or (
    public.current_user_role() = 'moderator'
    and (
      room_id is null
      or public.can_access_room(room_id)
    )
  )
  or reporter_id = auth.uid()
);

drop policy if exists "reports update governance" on public.reports;
create policy "reports update governance"
on public.reports for update
to authenticated
using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

drop policy if exists "admin actions read moderators" on public.admin_actions;
drop policy if exists "admin actions read governance" on public.admin_actions;
create policy "admin actions read governance"
on public.admin_actions for select
to authenticated
using (public.is_moderator_or_admin());

drop policy if exists "admin actions insert moderators" on public.admin_actions;
drop policy if exists "admin actions insert governance" on public.admin_actions;
create policy "admin actions insert governance"
on public.admin_actions for insert
to authenticated
with check (actor_id = auth.uid() and public.is_moderator_or_admin());

drop policy if exists "profile avatars read authenticated" on storage.objects;
create policy "profile avatars read authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'profile-avatars');

drop policy if exists "profile avatars upload own" on storage.objects;
create policy "profile avatars upload own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile avatars update own" on storage.objects;
create policy "profile avatars update own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile avatars delete own" on storage.objects;
create policy "profile avatars delete own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

insert into public.rooms (
  room_key,
  name,
  description,
  is_system,
  is_public,
  visibility,
  owner_id
)
values (
  'admin-moderator-channel',
  'Admin Moderator Channel',
  'Private governance channel for administrators and moderators.',
  true,
  false,
  'private',
  null
)
on conflict (room_key) do update
set name = excluded.name,
    description = excluded.description,
    is_system = true,
    is_public = false,
    visibility = 'private';
