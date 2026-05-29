-- Payment/webhook safe update. Run even if players table already exists.
alter table public.players add column if not exists razorpay_payment_id text;
alter table public.players add column if not exists razorpay_order_id text;
alter table public.players add column if not exists payment_amount integer default 999;
alter table public.players add column if not exists payment_currency text default 'INR';
alter table public.players add column if not exists paid_at timestamptz;

create table if not exists public.payments (
  id text primary key,
  player_id text,
  razorpay_payment_id text,
  razorpay_order_id text,
  amount integer,
  currency text default 'INR',
  status text,
  event text,
  payload jsonb,
  created_at timestamptz default now()
);
alter table public.payments enable row level security;
do $$ begin
  create policy "TMPCL public select payments" on public.payments for select to anon using (true);
exception when duplicate_object then null; end $$;
-- Writes to payments should happen from Edge Function using SERVICE_ROLE_KEY.
