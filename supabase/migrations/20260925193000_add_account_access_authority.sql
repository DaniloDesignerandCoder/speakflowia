create or replace function public.get_account_access()
returns table(
  effective_plan text,
  full_labs boolean,
  full_adaptive_learning boolean,
  full_history boolean,
  coach_monthly_limit integer,
  voice_character_monthly_limit integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    case
      when e.plan = 'pro'
        and e.subscription_status = 'active'
        and (e.current_period_end is null or e.current_period_end > now())
      then 'pro' else 'free'
    end as effective_plan,
    case when e.plan = 'pro' and e.subscription_status = 'active' and (e.current_period_end is null or e.current_period_end > now()) then true else false end as full_labs,
    case when e.plan = 'pro' and e.subscription_status = 'active' and (e.current_period_end is null or e.current_period_end > now()) then true else false end as full_adaptive_learning,
    case when e.plan = 'pro' and e.subscription_status = 'active' and (e.current_period_end is null or e.current_period_end > now()) then true else false end as full_history,
    case when e.plan = 'pro' and e.subscription_status = 'active' and (e.current_period_end is null or e.current_period_end > now()) then 1000 else 50 end as coach_monthly_limit,
    case when e.plan = 'pro' and e.subscription_status = 'active' and (e.current_period_end is null or e.current_period_end > now()) then 50000 else 5000 end as voice_character_monthly_limit
  from (select auth.uid() as user_id) a
  left join public.entitlements e on e.user_id = a.user_id
  where a.user_id is not null;
$$;

revoke all on function public.get_account_access() from public;
grant execute on function public.get_account_access() to authenticated;