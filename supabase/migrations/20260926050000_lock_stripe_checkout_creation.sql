create table if not exists public.stripe_checkout_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locked_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.stripe_checkout_locks enable row level security;
revoke all on table public.stripe_checkout_locks from public, anon, authenticated;

create or replace function public.claim_stripe_checkout(p_user_id uuid, p_hold_seconds integer default 120)
returns boolean
language plpgsql security definer set search_path=public
as $$
declare v_claimed boolean;
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  if p_hold_seconds < 30 or p_hold_seconds > 600 then raise exception 'invalid hold'; end if;
  insert into public.stripe_checkout_locks(user_id,locked_until)
  values(p_user_id, now() + make_interval(secs=>p_hold_seconds))
  on conflict(user_id) do update set
    locked_until=excluded.locked_until, updated_at=now()
    where stripe_checkout_locks.locked_until <= now()
  returning true into v_claimed;
  return coalesce(v_claimed,false);
end $$;

create or replace function public.release_stripe_checkout(p_user_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
begin
  if auth.role() <> 'service_role' then raise exception 'forbidden'; end if;
  delete from public.stripe_checkout_locks where user_id=p_user_id;
end $$;
revoke all on function public.claim_stripe_checkout(uuid,integer) from public,anon,authenticated;
revoke all on function public.release_stripe_checkout(uuid) from public,anon,authenticated;
grant execute on function public.claim_stripe_checkout(uuid,integer) to service_role;
grant execute on function public.release_stripe_checkout(uuid) to service_role;