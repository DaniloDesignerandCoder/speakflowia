create or replace function public.authorize_musiclab_track(p_track_index integer)
returns table(allowed boolean, effective_plan text, full_labs boolean)
language plpgsql security definer stable set search_path=public
as $$
declare v_user_id uuid:=auth.uid(); v_is_pro boolean:=false;
begin
 if v_user_id is null then raise exception 'unauthorized'; end if;
 if p_track_index is null or p_track_index < 0 then raise exception 'invalid track index'; end if;
 select coalesce(e.plan='pro' and e.subscription_status='active' and (e.current_period_end is null or e.current_period_end>now()),false)
 into v_is_pro from (select v_user_id user_id) u left join public.entitlements e on e.user_id=u.user_id;
 return query select (v_is_pro or p_track_index=0),case when v_is_pro then 'pro' else 'free' end,v_is_pro;
end; $$;
revoke all on function public.authorize_musiclab_track(integer) from public;
grant execute on function public.authorize_musiclab_track(integer) to authenticated;