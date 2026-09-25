create or replace function public.get_progress_access_data()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_session_limit integer := 5;
  v_insight_limit integer := 5;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;

  select coalesce(
    e.plan = 'pro'
    and e.subscription_status = 'active'
    and (e.current_period_end is null or e.current_period_end > now()),
    false
  )
  into v_is_pro
  from (select v_user_id as user_id) u
  left join public.entitlements e on e.user_id = u.user_id;

  if v_is_pro then
    v_session_limit := 30;
    v_insight_limit := 30;
  end if;

  select jsonb_build_object(
    'effective_plan', case when v_is_pro then 'pro' else 'free' end,
    'full_history', v_is_pro,
    'full_adaptive_learning', v_is_pro,
    'progress', coalesce((select to_jsonb(p) from (
      select conversations_count, total_minutes, streak_days, last_practice_date
      from public.progress where user_id = v_user_id limit 1
    ) p), '{}'::jsonb),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from (
      select id, mode, duration_seconds, score, summary, skills_practiced, positive_point, improvement_point, next_recommendation, created_at
      from public.learning_sessions where user_id = v_user_id
      order by created_at desc limit v_session_limit
    ) s), '[]'::jsonb),
    'insights', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from (
      select id, level, original_text, corrected_text, tip, skill_category, created_at
      from public.learning_insights where user_id = v_user_id
      order by created_at desc limit v_insight_limit
    ) i), '[]'::jsonb),
    'learning_plan', case when v_is_pro then coalesce((select to_jsonb(lp) from (
      select primary_goal, priority_skills, current_focus, next_milestone, coach_strategy, updated_at
      from public.learning_plans where user_id = v_user_id limit 1
    ) lp), 'null'::jsonb) else 'null'::jsonb end
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_progress_access_data() from public;
grant execute on function public.get_progress_access_data() to authenticated;