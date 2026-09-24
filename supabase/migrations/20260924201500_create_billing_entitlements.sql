-- SpeakFlow billing and entitlement foundation.
-- Billing providers and server-side webhooks are authoritative for Pro access.
-- No entitlement row means Free. Client applications must never infer or grant Pro
-- without a backend-validated entitlement row.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('mercado_pago')),
  provider_subscription_id text,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'pending' check (status in ('pending','active','past_due','canceled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_id_user_unique unique (id, user_id)
);

create unique index if not exists subscriptions_provider_subscription_uidx
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','pro')),
  subscription_status text not null default 'none' check (subscription_status in ('none','pending','active','past_due','canceled','expired')),
  current_period_end timestamptz,
  source_subscription_id uuid,
  updated_at timestamptz not null default now(),
  constraint entitlements_pro_billing_state_check check (
    plan = 'free'
    or (
      subscription_status in ('active','canceled')
      and source_subscription_id is not null
      and (subscription_status <> 'canceled' or current_period_end is not null)
    )
  ),
  constraint entitlements_source_subscription_owner_fk
    foreign key (source_subscription_id, user_id)
    references public.subscriptions (id, user_id)
    on delete set null (source_subscription_id)
);

create index if not exists entitlements_source_subscription_idx
  on public.entitlements(source_subscription_id)
  where source_subscription_id is not null;

create table if not exists public.usage_monthly (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null
    check (period_start = date_trunc('month', period_start::timestamp)::date),
  coach_interactions integer not null default 0 check (coach_interactions >= 0),
  voice_characters integer not null default 0 check (voice_characters >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mercado_pago')),
  -- The provider event ID is the unique notification/event identifier received
  -- from the provider, not merely a subscription or payment resource ID.
  provider_event_id text not null,
  event_type text,
  provider_subscription_id text,
  user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending'
    check (processing_status in ('pending','processing','processed','failed')),
  processing_error text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_events_user_id_idx
  on public.billing_events(user_id)
  where user_id is not null;

create index if not exists billing_events_provider_subscription_idx
  on public.billing_events(provider, provider_subscription_id)
  where provider_subscription_id is not null;

alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.usage_monthly enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own entitlements" on public.entitlements;
create policy "Users can view own entitlements"
  on public.entitlements for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own monthly usage" on public.usage_monthly;
create policy "Users can view own monthly usage"
  on public.usage_monthly for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.subscriptions from anon, authenticated;
revoke all on public.entitlements from anon, authenticated;
revoke all on public.usage_monthly from anon, authenticated;
revoke all on public.billing_events from anon, authenticated;

grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;
grant select on public.usage_monthly to authenticated;

create or replace function public.set_billing_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_billing_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_billing_updated_at();

drop trigger if exists usage_monthly_set_updated_at on public.usage_monthly;
create trigger usage_monthly_set_updated_at
before update on public.usage_monthly
for each row execute function public.set_billing_updated_at();
