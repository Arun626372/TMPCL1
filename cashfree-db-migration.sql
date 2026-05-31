-- TMPCL Cashfree payment fields migration
-- Run this in Supabase SQL editor before enabling Cashfree checkout.

alter table public.players
  add column if not exists payment_gateway text default 'cashfree',
  add column if not exists cashfree_order_id text,
  add column if not exists cashfree_payment_session_id text,
  add column if not exists cashfree_payment_id text,
  add column if not exists payment_verified_at timestamptz;

create index if not exists idx_players_cashfree_order_id on public.players(cashfree_order_id);
