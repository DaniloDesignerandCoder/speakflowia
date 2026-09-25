create or replace function public.upsert_coach_learning_plan(
 p_primary_goal text,p_priority_skills text,p_current_focus text,p_next_milestone text,p_coach_strategy text,p_evidence_summary text,p_sessions_analyzed integer
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_is_pro boolean:=false;
begin
 if v_user_id is null then raise exception 'unauthorized'; end if;
 select exists(select 1 from public.entitlements e where e.user_id=v_user_id and e.plan='pro' and e.subscription_status='active' and (e.current_period_end is null or e.current_period_end>now())) into v_is_pro;
 if not v_is_pro then return false; end if;
 insert into public.learning_plans(user_id,primary_goal,priority_skills,current_focus,next_milestone,coach_strategy,evidence_summary,sessions_analyzed,updated_at)
 values(v_user_id,p_primary_goal,p_priority_skills,p_current_focus,p_next_milestone,p_coach_strategy,p_evidence_summary,greatest(coalesce(p_sessions_analyzed,0),0),now())
 on conflict(user_id) do update set primary_goal=excluded.primary_goal,priority_skills=excluded.priority_skills,current_focus=excluded.current_focus,next_milestone=excluded.next_milestone,coach_strategy=excluded.coach_strategy,evidence_summary=excluded.evidence_summary,sessions_analyzed=excluded.sessions_analyzed,updated_at=now();
 return true;
end; $$;
revoke all on function public.upsert_coach_learning_plan(text,text,text,text,text,text,integer) from public;
grant execute on function public.upsert_coach_learning_plan(text,text,text,text,text,text,integer) to authenticated;
revoke insert, update on table public.learning_plans from anon, authenticated;