create table if not exists public.learning_insights (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    level text not null,
    original_text text not null,
    corrected_text text not null,
    tip text not null,
    created_at timestamptz not null default now()
  );

  alter table public.learning_insights enable row level security;

  create policy "Users can view own learning insights"
    on public.learning_insights
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

  create policy "Users can insert own learning insights"
    on public.learning_insights
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

  create index if not exists learning_insights_user_created_idx
    on public.learning_insights (user_id, created_at desc);;