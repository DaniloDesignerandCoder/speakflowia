create or replace function public.get_coach_memory_context()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_is_pro boolean:=false; v_result jsonb;
begin
 if v_user_id is null then raise exception 'unauthorized'; end if;
 select exists(select 1 from public.entitlements e where e.user_id=v_user_id and e.plan='pro' and e.subscription_status='active' and (e.current_period_end is null or e.current_period_end>now())) into v_is_pro;
 select jsonb_build_object(
  'effective_plan',case when v_is_pro then 'pro' else 'free' end,
  'adaptive',v_is_pro,
  'memory_rows',case when v_is_pro then coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from (select level,original_text,corrected_text,tip,skill_category,created_at from public.learning_insights where user_id=v_user_id order by created_at desc limit 8)i),'[]'::jsonb) else '[]'::jsonb end,
  'learning_plan',case when v_is_pro then coalesce((select to_jsonb(lp) from (select primary_goal,priority_skills,current_focus,next_milestone,coach_strategy,evidence_summary,sessions_analyzed from public.learning_plans where user_id=v_user_id limit 1)lp),'null'::jsonb) else 'null'::jsonb end,
  'last_session_summary',case when v_is_pro then coalesce((select to_jsonb(ls) from (select summary,skills_practiced,positive_point,improvement_point,next_recommendation,mode,created_at from public.learning_sessions where user_id=v_user_id and (summary is not null or skills_practiced is not null or positive_point is not null or improvement_point is not null or next_recommendation is not null) order by created_at desc limit 1)ls),'null'::jsonb) else 'null'::jsonb end
 ) into v_result; return v_result;
end; $$;
revoke all on function public.get_coach_memory_context() from public;
grant execute on function public.get_coach_memory_context() to authenticated;