-- Public-profile identity (plan F1). Still exposes nothing: no function or
-- policy reads another account's profile yet. This gives every account a
-- public handle, a bio and an explicit public/private choice, so that when
-- profiles do open (F2 onwards) each one is only visible because its owner
-- said so.

-- The public @handle. Deliberately not `username`: that one is a login
-- alias (features/auth/actions.ts), and publishing it would hand out half
-- of an account's credentials. Stored lowercase, so the format check alone
-- makes uniqueness case-insensitive.
alter table public.profiles
  add column handle text unique
    check (handle ~ '^[a-z0-9_]{3,30}$'),
  add column bio text
    check (bio is null or length(bio) <= 160),
  -- 'unset' until the account answers the question; treated as private
  -- everywhere. Every existing account starts here — none of them agreed
  -- to anything public — and so does every new one.
  add column visibility text not null default 'unset'
    check (visibility in ('unset', 'private', 'public')),
  -- When the account made its choice. Doubles as the record that it was a
  -- choice. Set by the trigger below, never by a client.
  add column visibility_chosen_at timestamptz,
  add constraint profiles_public_needs_handle
    check (visibility <> 'public' or handle is not null);

-- Handles nobody can take: the app's own names, and (later, from /admin)
-- the handles of known roasters, kept for them before someone else grabs
-- them. Only readable from inside the trigger below.
create table public.reserved_handles (
  handle text primary key check (handle ~ '^[a-z0-9_]{3,30}$'),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.reserved_handles enable row level security;
revoke all on public.reserved_handles from anon, authenticated;

insert into public.reserved_handles (handle, reason) values
  ('admin', 'app'), ('administrador', 'app'), ('administrator', 'app'),
  ('root', 'app'), ('system', 'app'), ('sistema', 'app'),
  ('grindaily', 'app'), ('grinday', 'app'),
  ('soporte', 'app'), ('support', 'app'), ('ayuda', 'app'), ('help', 'app'),
  ('moderador', 'app'), ('moderadora', 'app'), ('moderator', 'app'), ('moderacion', 'app'),
  ('staff', 'app'), ('equipo', 'app'), ('team', 'app'),
  ('oficial', 'app'), ('official', 'app'), ('verificado', 'app'), ('verified', 'app'),
  ('tostadora', 'app'), ('tostadoras', 'app'), ('roaster', 'app'), ('roasters', 'app'),
  ('seguridad', 'app'), ('security', 'app'), ('privacidad', 'app'), ('privacy', 'app'),
  ('null', 'app'), ('undefined', 'app'), ('anonimo', 'app'), ('anonymous', 'app');

-- Guards on every profile write:
--   * a reserved handle can't be taken (the table is private, hence
--     security definer);
--   * once chosen, visibility can move between private and public but
--     never back to 'unset';
--   * visibility_chosen_at follows the choice and can't be written directly
--     (no client grant on it; this is belt and braces for the owner role).
create or replace function public.guard_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.handle is distinct from old.handle
     and new.handle is not null
     and exists (select 1 from public.reserved_handles where handle = new.handle) then
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

revoke execute on function public.guard_profile_identity() from public, anon, authenticated;

create trigger profiles_guard_identity
  before update on public.profiles
  for each row execute function public.guard_profile_identity();

grant update (handle, bio, visibility) on public.profiles to authenticated;

-- Whether the public side of the app is switched on for the caller, per the
-- app_settings kill switch. Drives whether the app asks the visibility
-- question at all: there's no point choosing "public" while nothing is.
-- 'admins' only needs the role — this only decides what the app shows,
-- never what another account's data it can read.
create or replace function public.social_enabled_for_me()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (select social_enabled from public.app_settings)
    when 'all' then auth.uid() is not null
    when 'admins' then exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
    else false
  end;
$$;

revoke execute on function public.social_enabled_for_me() from public, anon;
grant execute on function public.social_enabled_for_me() to authenticated;
