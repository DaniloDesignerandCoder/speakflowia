-- SpeakFlow Learning Bridge
-- Persists per-user mastery from Vocabulary and Pronunciation Labs.

create table if not exists public.lab_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lab text not null check (lab in ('vocabulary', 'pronunciation')),
  item_key text not null,
  item_text text not null,
  source_insight_id uuid null,
  attempts integer not null default 0 check (attempts >= 0),
  successes integer not null default 0 check (successes >= 0),
  last_score integer null check (last_score between 0 and 100),
  best_score integer null check (best_score between 0 and 100),
  status text not null default 'new' check (status in ('new', 'learning', 'review', 'mastered')),
  last_practiced_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lab, item_key)
);

create index if not exists lab_mastery_user_lab_idx
  on public.lab_mastery (user_id, lab, status);

alter table public.lab_mastery enable row level security;

drop policy if exists "Users can view own lab mastery" on public.lab_mastery;
create policy "Users can view own lab mastery"
  on public.lab_mastery for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lab mastery" on public.lab_mastery;
create policy "Users can insert own lab mastery"
  on public.lab_mastery for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lab mastery" on public.lab_mastery;
create policy "Users can update own lab mastery"
  on public.lab_mastery for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own lab mastery" on public.lab_mastery;
create policy "Users can delete own lab mastery"
  on public.lab_mastery for delete
  using (auth.uid() = user_id);

create or replace function public.set_lab_mastery_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lab_mastery_updated_at on public.lab_mastery;
create trigger set_lab_mastery_updated_at
before update on public.lab_mastery
for each row execute function public.set_lab_mastery_updated_at();
