-- Bound AI-backed session-summary operations independently from user-visible Coach interactions.
-- This prevents direct session_summary calls from creating unbounded provider cost without double-charging Coach messages.

alter table public.usage_monthly
  add column if not exists coach_summaries integer not null default 0;

create or replace function public.reserve_coach_summary_usage()
returns table(allowed boolean, used integer, usage_limit integer, remaining integer, effective_plan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period_start date := date_trunc('month', current_date)::date;
  v_plan text := 'free';
  v_limit integer := 60;
  v_used integer := 0;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;

  select case
    when e.plan = 'pro'
      and e.subscription_status = 'active'
      and (e.current_period_end is null or e.current_period_end > now())
    then 'pro' else 'free' end
  into v_plan
  from public.entitlements e
  where e.user_id = v_user_id;

  v_plan := coalesce(v_plan, 'free');
  v_limit := case when v_plan = 'pro' then 1200 else 60 end;

  insert into public.usage_monthly (user_id, period_start, coach_summaries)
  values (v_user_id, v_period_start, 0)
  on conflict (user_id, period_start) do nothing;

  select u.coach_summaries into v_used
  from public.usage_monthly u
  where u.user_id = v_user_id and u.period_start = v_period_start
  for update;

  if v_used + 1 > v_limit then
    return query select false, v_used, v_limit, greatest(0, v_limit - v_used), v_plan;
    return;
  end if;

  update public.usage_monthly
  set coach_summaries = coach_summaries + 1, updated_at = now()
  where user_id = v_user_id and period_start = v_period_start
  returning coach_summaries into v_used;

  return query select true, v_used, v_limit, greatest(0, v_limit - v_used), v_plan;
end;
$$;

revoke all on function public.reserve_coach_summary_usage() from public, anon;
grant execute on function public.reserve_coach_summary_usage() to authenticated;
grant execute on function public.reserve_coach_summary_usage() to service_role;
