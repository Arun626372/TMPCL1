TMPCL Supabase Setup

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Open the file: supabase-schema.sql
4. Copy all SQL and click Run.
5. After SQL runs successfully, upload this website ZIP to hosting.

Connected Supabase project:
URL: https://ybfrnvkikhtlouocobnk.supabase.co

Important:
- This static version uses the Supabase anon key in frontend.
- For final real launch, TMPCL Team login and Razorpay payment verification should be moved to a secure backend or Supabase Auth + server-side verification.
- Current database policies are open so this version can work on static hosting during testing.


BRAND AMBASSADOR SQL NOTE:
- Brand Ambassador profiles use the existing `leadership_panel` table with `type = Brand Ambassador`.
- The latest `supabase-schema.sql` now includes two safe placeholder brand ambassador records.
- If you already ran the older schema, run `supabase-brand-ambassador-update.sql` once in Supabase SQL Editor.
- No data will be deleted; the SQL uses `create table if not exists` and `on conflict do nothing`.


CLEAN BASELINE NOTE:
This package uses a clean consolidated styles.css. Old visual patch layers have been removed. Use supabase-schema.sql for full database setup.
