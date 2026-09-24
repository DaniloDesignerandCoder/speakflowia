create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  english_level text check (english_level in ('beginner','elementary','intermediate','upper_intermediate','advanced','unknown')) default 'unknown',
  daily_goal_minutes integer not null default 15 check (daily_goal_minutes between 5 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('conversation','pronunciation','vocabulary','grammar','musiclab')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  score numeric(5,2) check (score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  streak_days integer not null default 0 check (streak_days >= 0),
  total_minutes integer not null default 0 check (total_minutes >= 0),
  conversations_count integer not null default 0 check (conversations_count >= 0),
  vocabulary_count integer not null default 0 check (vocabulary_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.progress enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.learning_sessions to authenticated;
grant select, insert, update on public.progress to authenticated;

create policy "Users can view own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can view own sessions" on public.learning_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own sessions" on public.learning_sessions for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can view own progress" on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own progress" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own progress" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  insert into public.progress (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();;