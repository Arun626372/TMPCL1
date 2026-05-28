-- TMPCL Brand Ambassador update patch
-- Run this only if you already ran an older schema and Brand Ambassador placeholders/options are missing.

create table if not exists public.leadership_panel (
  id text primary key,
  name text not null,
  type text,
  designation text,
  bio text,
  photo_url text,
  created_at timestamptz default now()
);

alter table public.leadership_panel enable row level security;

do $$ begin
  create policy "TMPCL public select leadership" on public.leadership_panel for select to anon using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "TMPCL public insert leadership" on public.leadership_panel for insert to anon with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "TMPCL public update leadership" on public.leadership_panel for update to anon using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "TMPCL public delete leadership" on public.leadership_panel for delete to anon using (true);
exception when duplicate_object then null; end $$;

insert into public.leadership_panel (id, name, type, designation, bio)
values
  ('leader-brand-ambassador-1', 'Brand Ambassador 1', 'Brand Ambassador', 'Brand Ambassador, TMPCL', 'TMPCL ke official brand face ke roop me Madhya Pradesh ke tennis ball cricket talent mission ko support karenge.'),
  ('leader-brand-ambassador-2', 'Brand Ambassador 2', 'Brand Ambassador', 'Brand Ambassador, TMPCL', 'TMPCL ki energy, sportsmanship aur player recognition mission ko represent karenge.')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('leadership-photos', 'leadership-photos', true)
on conflict (id) do nothing;
