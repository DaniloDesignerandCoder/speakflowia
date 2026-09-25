create or replace function public.record_conversation_progress(p_duration_seconds integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid(); v_today date:=current_date; v_row public.progress%rowtype; v_minutes integer;
begin
 if v_user_id is null then raise exception 'unauthorized'; end if;
 if p_duration_seconds is null or p_duration_seconds<0 then raise exception 'invalid duration'; end if;
 v_minutes:=greatest(1,round(p_duration_seconds::numeric/60)::integer);
 select * into v_row from public.progress where user_id=v_user_id for update;
 if found then
  update public.progress set conversations_count=coalesce(v_row.conversations_count,0)+1,total_minutes=coalesce(v_row.total_minutes,0)+v_minutes,
  streak_days=case when v_row.last_practice_date=v_today then coalesce(v_row.streak_days,0) when v_row.last_practice_date=v_today-1 then coalesce(v_row.streak_days,0)+1 else 1 end,
  last_practice_date=v_today where user_id=v_user_id;
 else
  insert into public.progress(user_id,conversations_count,total_minutes,streak_days,last_practice_date) values(v_user_id,1,v_minutes,1,v_today);
 end if;
end; $$;
revoke all on function public.record_conversation_progress(integer) from public;
grant execute on function public.record_conversation_progress(integer) to authenticated;