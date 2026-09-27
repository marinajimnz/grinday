-- Favourites (plan F5): a private list of saved profiles. Not a "follow":
-- nobody is told, nobody can see who saved them or how many times, and no
-- other account can read anyone's list.
--
-- The table is closed to clients entirely; every read and write goes
-- through the functions below, so the saved account's id never leaves the
-- database either.

create table public.profile_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, target_id),
  check (user_id <> target_id)
);

create index profile_bookmarks_user_id_idx on public.profile_bookmarks (user_id, created_at desc);
-- For the cascade when a saved account is deleted.
create index profile_bookmarks_target_id_idx on public.profile_bookmarks (target_id);

alter table public.profile_bookmarks enable row level security;
revoke all on public.profile_bookmarks from anon, authenticated;

-- Save a profile the caller can currently see. Saving twice is a no-op;
-- a private, suspended or missing profile (or yourself) is refused the
-- same way, so this can't be used to probe which accounts exist.
create or replace function public.save_profile(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
begin
  select p.id into v_target
    from public.profiles p
    where p.username = lower(btrim(p_username))
      and p.id <> auth.uid()
      and public.profile_is_visible_to_me(p.id);

  if v_target is null then
    raise exception 'profile not available' using errcode = 'P0002';
  end if;

  insert into public.profile_bookmarks (user_id, target_id)
  values (auth.uid(), v_target)
  on conflict (user_id, target_id) do nothing;
end;
$$;

-- Remove a saved profile by username (from the profile or search) — works
-- whatever the profile's visibility now, since it only touches your list.
create or replace function public.unsave_profile(p_username text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.profile_bookmarks b
  using public.profiles p
  where b.user_id = auth.uid()
    and b.target_id = p.id
    and p.username = lower(btrim(p_username));
$$;

-- Remove by the bookmark's own id — for a saved profile that is no longer
-- available, which the list can't name.
create or replace function public.remove_favourite(p_bookmark_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.profile_bookmarks
  where id = p_bookmark_id and user_id = auth.uid();
$$;

-- The caller's list, newest first. A profile that has since gone private
-- or been suspended stays on the list — it's yours to remove — but comes
-- back with no name, username or kind: just "not available".
create or replace function public.get_my_favourites()
returns table (
  bookmark_id uuid,
  available boolean,
  username text,
  display_name text,
  account_type text,
  saved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    v.visible,
    case when v.visible then p.username end,
    case when v.visible then p.display_name end,
    case when v.visible then 'person'::text end,
    b.created_at
  from public.profile_bookmarks b
  join public.profiles p on p.id = b.target_id
  cross join lateral (select public.profile_is_visible_to_me(p.id) as visible) v
  where b.user_id = auth.uid()
  order by b.created_at desc;
$$;

-- Whether the caller has saved `p_username` — for the save button's state.
create or replace function public.is_profile_saved(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_bookmarks b
    join public.profiles p on p.id = b.target_id
    where b.user_id = auth.uid() and p.username = lower(btrim(p_username))
  );
$$;

revoke execute on function public.save_profile(text) from public, anon;
revoke execute on function public.unsave_profile(text) from public, anon;
revoke execute on function public.remove_favourite(uuid) from public, anon;
revoke execute on function public.get_my_favourites() from public, anon;
revoke execute on function public.is_profile_saved(text) from public, anon;
grant execute on function public.save_profile(text) to authenticated;
grant execute on function public.unsave_profile(text) to authenticated;
grant execute on function public.remove_favourite(uuid) to authenticated;
grant execute on function public.get_my_favourites() to authenticated;
grant execute on function public.is_profile_saved(text) to authenticated;
