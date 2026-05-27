alter table public.profiles
add column if not exists expertise_tags text[] not null default '{}';
