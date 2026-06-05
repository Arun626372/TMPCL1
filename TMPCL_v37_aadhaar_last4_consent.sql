-- TMPCL v37 privacy-safe registration columns
-- Run once in Supabase SQL Editor before using the updated registration form.

alter table public.players
add column if not exists aadhaar_last4 text;

alter table public.players
add column if not exists document_consent boolean default false;
