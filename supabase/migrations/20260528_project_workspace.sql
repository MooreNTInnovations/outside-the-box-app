alter table public.profiles
add column if not exists email text;

update public.profiles
set email = auth.users.email
from auth.users
where profiles.id = auth.users.id
  and profiles.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop policy if exists "profiles read project collaborators" on public.profiles;
create policy "profiles read project collaborators"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.project_members viewer
    join public.project_members subject
      on subject.project_id = viewer.project_id
    where viewer.user_id = auth.uid()
      and subject.user_id = profiles.id
  )
);

create or replace function public.can_collaborate_on_project(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = target_project_id
      and owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = auth.uid()
  );
$$;

alter table public.messages
add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.messages
alter column room_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_room_or_project_check'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
    add constraint messages_room_or_project_check
    check (room_id is not null or project_id is not null);
  end if;
end $$;

drop policy if exists "messages read project members" on public.messages;
create policy "messages read project members"
on public.messages for select
to authenticated
using (project_id is not null and public.can_collaborate_on_project(project_id));

drop policy if exists "messages insert project members as self" on public.messages;
create policy "messages insert project members as self"
on public.messages for insert
to authenticated
with check (
  author_id = auth.uid()
  and project_id is not null
  and public.can_collaborate_on_project(project_id)
);
