-- The first thing any account can read of another (plan F2): the header of
-- a public profile — name, @username, bio, kind of account and three
-- counts. Nothing else, and only through the function below; no table's
-- RLS changes.

-- Moderation can take a profile off the public side without touching the
-- account itself: a suspended profile answers exactly like a private one,
-- whatever its owner chose, while the owner's own diary keeps working.
-- Only admin functions (F6a) change it; no client grant.
alter table public.profiles
  add column moderation_status text not null default 'active'
    check (moderation_status in ('active', 'suspended'));

-- The one gate every public read goes through: may the caller see
-- `p_profile_id`'s public side right now? The kill switch has to be on for
-- the caller, and the profile public, named and not suspended.
create or replace function public.profile_is_visible_to_me(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.social_enabled_for_me()
    and exists (
      select 1 from public.profiles
      where id = p_profile_id
        and visibility = 'public'
        and moderation_status = 'active'
        and username is not null
    );
$$;

revoke execute on function public.profile_is_visible_to_me(uuid) from public, anon, authenticated;

-- A private, suspended, unnamed or nonexistent profile all come back as no
-- row at all, so the answer can't tell anyone which accounts exist. The
-- return type lists its columns one by one: a column added to profiles or
-- coffees later is never published by accident. No account ids go out.
create or replace function public.get_public_profile(p_username text)
returns table (
  username text,
  display_name text,
  bio text,
  account_type text,
  coffees_count integer,
  recipes_count integer,
  attempts_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.username,
    p.display_name,
    p.bio,
    -- 'roaster' joins when F6a adds the role; every other role is a person.
    'person'::text,
    (select count(*)::integer from public.coffees c
      where c.user_id = p.id and c.archived_at is null),
    (select count(*)::integer from public.coffees c
      where c.user_id = p.id and c.archived_at is null and c.preferred_attempt_id is not null),
    (select count(*)::integer from public.brew_attempts a
      join public.coffees c on c.id = a.coffee_id
      where a.user_id = p.id and c.archived_at is null)
  from public.profiles p
  where p.username = lower(btrim(p_username))
    and public.profile_is_visible_to_me(p.id);
$$;

revoke execute on function public.get_public_profile(text) from public, anon;
grant execute on function public.get_public_profile(text) to authenticated;
