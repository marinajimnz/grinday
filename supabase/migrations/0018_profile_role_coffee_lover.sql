-- Only the original account(s) (admin, marinajimnz) are 'admin' — every
-- account created through public sign-up from now on is a 'coffee_lover'
-- instead. Existing rows keep whatever role they already have.

alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  alter column role set default 'coffee_lover';

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'coffee_lover'));
