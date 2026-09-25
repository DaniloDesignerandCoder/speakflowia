-- Add Stripe as a supported billing provider while preserving Mercado Pago.
-- This migration does not grant Pro access and does not remove existing providers.

alter table public.subscriptions
  drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('mercado_pago', 'stripe'));

alter table public.billing_events
  drop constraint if exists billing_events_provider_check;

alter table public.billing_events
  add constraint billing_events_provider_check
  check (provider in ('mercado_pago', 'stripe'));
