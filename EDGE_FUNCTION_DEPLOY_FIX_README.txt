TMPCL Razorpay Webhook Deploy Fix

Your deploy failed because SQL content was pasted into Edge Function index.ts.
Edge Function index.ts must contain TypeScript code only.
SQL must be run separately in Supabase SQL Editor.

Correct files:
1) Supabase Edge Function code:
   supabase/functions/razorpay-webhook/index.ts

2) SQL update file:
   supabase-payment-webhook-update.sql

Deploy order:
1. Supabase SQL Editor:
   Run supabase-payment-webhook-update.sql

2. Supabase Edge Functions:
   Create/deploy function named: razorpay-webhook
   Paste/upload only this file content:
   supabase/functions/razorpay-webhook/index.ts

3. Secrets required in Supabase Edge Function Secrets:
   RAZORPAY_KEY_ID
   RAZORPAY_KEY_SECRET
   RAZORPAY_WEBHOOK_SECRET
   SERVICE_ROLE_KEY

4. Razorpay webhook URL after deploy:
   https://ybfrnvkikhtlouocobnk.supabase.co/functions/v1/razorpay-webhook

Events:
- payment.captured
- payment.failed
- order.paid
