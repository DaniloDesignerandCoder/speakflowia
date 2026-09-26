alter table public.subscriptions add column if not exists provider_event_created_at timestamptz;

create or replace function public.apply_stripe_subscription_event(
  p_user_id uuid,
  p_provider_subscription_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_event_created_at timestamptz
) returns table(subscription_id uuid, applied boolean)
language plpgsql security definer set search_path=public
as $$
declare v_existing public.subscriptions;
declare v_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  select * into v_existing from public.subscriptions
  where provider='stripe' and provider_subscription_id=p_provider_subscription_id
  for update;
  if found and v_existing.provider_event_created_at is not null
     and p_event_created_at <= v_existing.provider_event_created_at then
    return query select v_existing.id,false; return;
  end if;
  if found and v_existing.user_id <> p_user_id then raise exception 'subscription user mismatch'; end if;
  insert into public.subscriptions(user_id,provider,provider_subscription_id,plan,status,current_period_start,current_period_end,cancel_at_period_end,provider_event_created_at)
  values(p_user_id,'stripe',p_provider_subscription_id,'pro',p_status,p_current_period_start,p_current_period_end,p_cancel_at_period_end,p_event_created_at)
  on conflict(provider,provider_subscription_id) do update set
    status=excluded.status,current_period_start=excluded.current_period_start,current_period_end=excluded.current_period_end,
    cancel_at_period_end=excluded.cancel_at_period_end,provider_event_created_at=excluded.provider_event_created_at,updated_at=now()
  returning id into v_id;
  return query select v_id,true;
end $$;
revoke all on function public.apply_stripe_subscription_event(uuid,text,text,timestamptz,timestamptz,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_stripe_subscription_event(uuid,text,text,timestamptz,timestamptz,boolean,timestamptz) to service_role;