create table if not exists public.customer_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_type text not null,
  provider_subscription_id text not null,
  status text not null default 'processing' check (status in ('processing','sent')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (email_type, provider_subscription_id)
);

alter table public.customer_email_deliveries enable row level security;
revoke all on table public.customer_email_deliveries from public, anon, authenticated;
grant all on table public.customer_email_deliveries to service_role;

create or replace function public.claim_pro_welcome_email(p_user_id uuid, p_provider_subscription_id text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_row public.customer_email_deliveries;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  insert into public.customer_email_deliveries(user_id,email_type,provider_subscription_id,status)
  values(p_user_id,'pro_welcome',p_provider_subscription_id,'processing')
  on conflict(email_type,provider_subscription_id) do nothing
  returning * into v_row;
  return jsonb_build_object('claimed', v_row.id is not null);
end $$;

create or replace function public.complete_pro_welcome_email(p_provider_subscription_id text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  update public.customer_email_deliveries set status='sent',sent_at=now()
  where email_type='pro_welcome' and provider_subscription_id=p_provider_subscription_id and status='processing';
end $$;

create or replace function public.release_pro_welcome_email(p_provider_subscription_id text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  delete from public.customer_email_deliveries
  where email_type='pro_welcome' and provider_subscription_id=p_provider_subscription_id and status='processing';
end $$;

revoke all on function public.claim_pro_welcome_email(uuid,text) from public,anon,authenticated;
revoke all on function public.complete_pro_welcome_email(text) from public,anon,authenticated;
revoke all on function public.release_pro_welcome_email(text) from public,anon,authenticated;
grant execute on function public.claim_pro_welcome_email(uuid,text) to service_role;
grant execute on function public.complete_pro_welcome_email(text) to service_role;
grant execute on function public.release_pro_welcome_email(text) to service_role;