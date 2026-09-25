create or replace function public.get_musiclab_adaptive_cue()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_plan record;
  v_insight record;
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

  if not v_is_pro then
    return jsonb_build_object(
      'effective_plan','free',
      'adaptive',false,
      'title','Foco desta sessão',
      'detail','Ouça a frase uma vez, depois repita tentando preservar o ritmo natural.',
      'signal_text',''
    );
  end if;

  select current_focus, next_milestone, priority_skills
  into v_plan
  from public.learning_plans
  where user_id = v_user_id
  limit 1;

  select skill_category, tip
  into v_insight
  from public.learning_insights
  where user_id = v_user_id
    and lower(coalesce(skill_category,'')) like '%musiclab%'
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'effective_plan','pro',
    'adaptive',true,
    'title',case when v_insight.tip is not null then 'Seu último insight MusicLab'
                 when v_plan.current_focus is not null then 'Seu foco adaptativo'
                 else 'Foco desta sessão' end,
    'detail',coalesce(v_insight.tip,v_plan.current_focus,v_plan.next_milestone,'Ouça a frase uma vez, depois repita tentando preservar o ritmo natural.'),
    'signal_text',lower(concat_ws(' ',v_insight.tip,v_plan.current_focus,v_plan.priority_skills))
  );
end;
$$;

revoke all on function public.get_musiclab_adaptive_cue() from public;
grant execute on function public.get_musiclab_adaptive_cue() to authenticated;