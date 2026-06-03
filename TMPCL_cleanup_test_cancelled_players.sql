-- TMPCL test / cancelled / abandoned registration cleanup
-- Run this in Supabase SQL Editor only after checking the SELECT result below.

-- 1) First check which rows will be removed:
select id, name, mobile, payment_status, created_at
from players
where id like 'TMPCL-PENDING-%'
   or coalesce(payment_status, '') in ('Payment Pending', 'Pending', 'Cancelled', 'Canceled', 'Failed', 'Payment Failed')
order by created_at desc;

-- 2) If the above list is correct, run this DELETE:
delete from players
where id like 'TMPCL-PENDING-%'
   or coalesce(payment_status, '') in ('Payment Pending', 'Pending', 'Cancelled', 'Canceled', 'Failed', 'Payment Failed');

-- Paid registrations are NOT deleted by this query.
