-- Make quota rollback server-only while preserving authenticated reservations.
-- Edge Functions call these rollback RPCs with the service role after a failed upstream operation.

drop function if exists public.release_coach_usage();
drop function if exists public.release_voice_usage(integer);

create or replace function public.release_coach_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', current_date)::date;
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;

  update public.usage_monthly
  set coach_interactions = greatest(0, coach_interactions - 1),
      updated_at = now()
  where user_id = p_user_id
    and period_start = v_period_start;
end;
$$;

create or replace function public.release_voice_usage(p_user_id uuid, p_characters integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', current_date)::date;
begin
  if p_user_id is null then
    raise exception 'invalid user';
  end if;
  if p_characters is null or p_characters < 1 or p_characters > 500 then
    raise exception 'invalid voice usage amount';
  end if;

  update public.usage_monthly
  set voice_characters = greatest(0, voice_characters - p_characters),
      updated_at = now()
  where user_id = p_user_id
    and period_start = v_period_start;
end;
$$;

revoke all on function public.release_coach_usage(uuid) from public, anon, authenticated;
revoke all on function public.release_voice_usage(uuid, integer) from public, anon, authenticated;
grant execute on function public.release_coach_usage(uuid) to service_role;
grant execute on function public.release_voice_usage(uuid, integer) to service_role;
