alter table public.learning_insights
add column if not exists skill_category text;

create index if not exists learning_insights_user_skill_idx
on public.learning_insights (user_id, skill_category, created_at desc);;