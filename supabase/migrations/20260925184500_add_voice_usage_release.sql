create or replace function public.release_voice_usage(p_characters integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period_start date := date_trunc('month', current_date)::date;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  if p_characters is null or p_characters < 1 or p_characters > 500 then
    raise exception 'invalid voice usage amount';
  end if;

  update public.usage_monthly
  set voice_characters = greatest(0, voice_characters - p_characters),
      updated_at = now()
  where user_id = v_user_id
    and period_start = v_period_start;
end;
$$;

revoke all on function public.release_voice_usage(integer) from public;
grant execute on function public.release_voice_usage(integer) to authenticated;