create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  title text,
  organization text,
  discipline text,
  bio text,
  expertise_tags text[] not null default '{}',
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_key text not null unique,
  name text not null unique,
  description text,
  is_system boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  summary text,
  visibility text not null default 'private' check (visibility in ('private', 'discoverable', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'lead', 'owner')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'collaboration-files',
  object_path text not null,
  display_name text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (room_id is not null or project_id is not null or owner_id is not null)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('message', 'project', 'profile', 'file')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.files enable row level security;
alter table public.reports enable row level security;
alter table public.admin_actions enable row level security;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('moderator', 'admin')
  );
$$;

create or replace function public.can_access_room(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms
    where id = target_room_id
      and is_public = true
  )
  or exists (
    select 1 from public.room_members
    where room_id = target_room_id
      and user_id = auth.uid()
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
    select 1 from public.projects
    where id = target_project_id
      and (
        visibility in ('public', 'discoverable')
        or owner_id = auth.uid()
      )
  )
  or exists (
    select 1 from public.project_members
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

create policy "profiles read own"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_moderator_or_admin());

create policy "profiles update own safe fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "rooms read public system"
on public.rooms for select
to authenticated
using ((is_system = true and is_public = true) or public.can_access_room(id));

create policy "room members read own rooms"
on public.room_members for select
to authenticated
using (user_id = auth.uid() or public.is_moderator_or_admin());

create policy "room members join public rooms"
on public.room_members for insert
to authenticated
with check (user_id = auth.uid() and role = 'member' and public.can_join_public_room(room_id));

create policy "messages read accessible rooms"
on public.messages for select
to authenticated
using (public.can_access_room(room_id));

create policy "messages insert as self"
on public.messages for insert
to authenticated
with check (author_id = auth.uid() and public.can_access_room(room_id));

create policy "projects read accessible"
on public.projects for select
to authenticated
using (owner_id = auth.uid() or visibility in ('public', 'discoverable') or public.can_access_project(id));

create policy "projects insert as owner"
on public.projects for insert
to authenticated
with check (owner_id = auth.uid());

create policy "project members read accessible"
on public.project_members for select
to authenticated
using (user_id = auth.uid() or public.can_access_project(project_id));

create policy "project members join public or discoverable"
on public.project_members for insert
to authenticated
with check (public.can_insert_project_membership(project_id, user_id, role));

create policy "project members leave own membership"
on public.project_members for delete
to authenticated
using (user_id = auth.uid());

create policy "files read accessible"
on public.files for select
to authenticated
using (
  owner_id = auth.uid()
  or (room_id is not null and public.can_access_room(room_id))
  or (project_id is not null and public.can_access_project(project_id))
);

create policy "files insert as owner"
on public.files for insert
to authenticated
with check (
  owner_id = auth.uid()
  and (
    room_id is null
    or public.can_access_room(room_id)
  )
  and (
    project_id is null
    or public.can_access_project(project_id)
  )
);

create policy "reports insert own"
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "reports read moderators"
on public.reports for select
to authenticated
using (public.is_moderator_or_admin());

create policy "admin actions read moderators"
on public.admin_actions for select
to authenticated
using (public.is_moderator_or_admin());

create policy "admin actions insert moderators"
on public.admin_actions for insert
to authenticated
with check (actor_id = auth.uid() and public.is_moderator_or_admin());

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_moderator_or_admin() then
    raise exception 'Role changes require moderator or admin privileges.';
  end if;

  return new;
end;
$$;

create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_members;
alter publication supabase_realtime add table public.files;

insert into public.rooms (room_key, name, description, is_system, is_public)
values
  ('collaboration-chat', 'Collaboration Chat', 'Controlled interdisciplinary collaboration room.', true, true),
  ('ideas-chat', 'Ideas Chat', 'Structured room for early concepts and invention discussion.', true, true),
  ('general-chat', 'General Chat', 'Professional general discussion room.', true, true)
on conflict (room_key) do nothing;
