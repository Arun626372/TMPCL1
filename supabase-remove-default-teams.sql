-- TMPCL demo/default teams cleanup
-- Run this once in Supabase SQL Editor if default teams are already visible.

delete from public.teams
where id in ('team-bhopal', 'team-indore', 'team-gwalior')
   or name in ('Bhopal Strikers', 'Indore Warriors', 'Gwalior Royals');
