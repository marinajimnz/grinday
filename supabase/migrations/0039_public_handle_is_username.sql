-- The public @ is the username. 0038 gave profiles a separate `handle` so
-- the login alias would never be published; the product call now is one
-- name for both — people are found by the same name they sign in with, the
-- way most apps do it. The visibility prompt says so in plain words before
-- anyone goes public.
--
-- Nothing is lost: the only public profile's handle already equals its
-- username, and no other account has a handle set.

alter table public.profiles
  drop constraint profiles_public_needs_handle,
  drop column handle,
  add constraint profiles_public_needs_username
    check (visibility <> 'public' or username is not null),
  -- What sign-up and Settings → Account already enforce, now in the
  -- database too, since it's also the public name. Every existing username
  -- already fits.
  add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_-]{3,20}$');

-- reserved_handles now guards usernames: no new account or rename can take
-- one, and an account that already has one (the original `admin`) can't go
-- public under it.
create or replace function public.guard_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is distinct from old.username
     and new.username is not null
     and exists (select 1 from public.reserved_handles where handle = new.username) then
    raise exception 'handle_reserved' using errcode = 'P0001';
  end if;

  if new.visibility = 'public'
     and old.visibility is distinct from 'public'
     and exists (select 1 from public.reserved_handles where handle = new.username) then
    raise exception 'handle_reserved' using errcode = 'P0001';
  end if;

  if new.visibility is distinct from old.visibility then
    if new.visibility = 'unset' then
      raise exception 'visibility cannot go back to unset' using errcode = '22023';
    end if;
    new.visibility_chosen_at := now();
  else
    new.visibility_chosen_at := old.visibility_chosen_at;
  end if;

  return new;
end;
$$;

-- The format check on reserved_handles predates usernames allowing '-' and
-- capping at 20; widen it so any username can be reserved.
alter table public.reserved_handles
  drop constraint reserved_handles_handle_check,
  add constraint reserved_handles_handle_check check (handle ~ '^[a-z0-9_-]{3,30}$');
