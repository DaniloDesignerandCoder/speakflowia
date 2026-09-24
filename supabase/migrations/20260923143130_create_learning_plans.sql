create table public.learning_plans (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null unique references public.profiles(id) on delete cascade,
      primary_goal text null,
      priority_skills text null,
      current_focus text null,
      next_milestone text null,
      coach_strategy text null,
      evidence_summary text null,
      sessions_analyzed integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table public.learning_plans enable row level security;

    create policy "Users can view own learning plan"
      on public.learning_plans
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy "Users can insert own learning plan"
      on public.learning_plans
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy "Users can update own learning plan"
      on public.learning_plans
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  ;