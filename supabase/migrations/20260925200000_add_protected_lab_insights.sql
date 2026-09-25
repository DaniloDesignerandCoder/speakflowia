create or replace function public.get_lab_insights(p_lab text)
returns table(id uuid, original_text text, corrected_text text, tip text, skill_category text, created_at timestamptz)
language plpgsql security definer stable set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_limit integer := 5;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  if p_lab not in ('vocabulary','pronunciation') then raise exception 'invalid lab'; end if;

  select coalesce(e.plan='pro' and e.subscription_status='active' and (e.current_period_end is null or e.current_period_end > now()),false)
  into v_is_pro
  from (select v_user_id as user_id) u left join public.entitlements e on e.user_id=u.user_id;

  if v_is_pro then v_limit := 80; end if;

  return query
  select li.id, li.original_text, li.corrected_text, li.tip, li.skill_category, li.created_at
  from public.learning_insights li
  where li.user_id=v_user_id
    and (
      (p_lab='vocabulary' and (
        lower(coalesce(li.skill_category,'')) like '%vocab%'
        or lower(coalesce(li.skill_category,'')) like '%word%'
        or lower(coalesce(li.skill_category,'')) like '%lex%'
        or lower(coalesce(li.skill_category,'')) like '%expression%'
        or lower(coalesce(li.skill_category,'')) like '%phrase%'
      ))
      or
      (p_lab='pronunciation' and (
        lower(coalesce(li.skill_category,'')) like '%pronun%'
        or lower(coalesce(li.skill_category,'')) like '%sound%'
        or lower(coalesce(li.skill_category,'')) like '%phon%'
      ))
    )
  order by li.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.get_lab_insights(text) from public;
grant execute on function public.get_lab_insights(text) to authenticated;