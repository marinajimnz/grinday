-- Only marinajimnz moderates. The original `admin` account (from before
-- public sign-up existed) kept the admin role without a second factor: it
-- couldn't act as an admin (is_admin() needs aal2), but anyone who got its
-- password could enrol their own authenticator and become one. It becomes
-- a regular account; its data stays exactly as it is.
--
-- set_profile_role() refuses admin accounts by design, so this is the
-- SQL-editor path it points to, logged the same way the function would.
with demoted as (
  update public.profiles
  set role = 'coffee_lover'
  where username = 'admin' and role = 'admin'
  returning id
)
insert into public.moderation_events (actor_id, target_id, action, reason, details)
select
  (select id from public.profiles where username = 'marinajimnz' and role = 'admin'),
  demoted.id,
  'role_changed',
  'Solo marinajimnz modera: la cuenta original admin pasa a ser una cuenta normal.',
  jsonb_build_object('from', 'admin', 'to', 'coffee_lover')
from demoted;
