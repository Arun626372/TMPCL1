TMPCL Cashfree Setup Notes

This ZIP is Cashfree-ready but does NOT hardcode Cashfree Client Secret in frontend.

Required Supabase Edge Functions:
1) create-cashfree-order
2) verify-cashfree-payment
3) cashfree-webhook for final production confirmation

Required Supabase secrets:
CASHFREE_CLIENT_ID
CASHFREE_CLIENT_SECRET
CASHFREE_ENV=sandbox   (change to production only after live approval)
CASHFREE_WEBHOOK_SECRET

Required database migration:
Run cashfree-db-migration.sql in Supabase SQL editor.

Frontend flow:
registration.html -> creates Payment Pending player row -> checkout.html?rid=TMPCL-xxxx -> Cashfree checkout -> webhook/verify marks Paid.

Important:
Never place Cashfree Client Secret in script.js or any HTML file.
Payment should be marked Paid only after backend verification/webhook.
