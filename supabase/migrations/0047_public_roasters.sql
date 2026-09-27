-- Roasters on the public side (plan F6b): the kind of account the header,
-- search and favourites report now follows the role an admin approved,
-- and search's "Roasters" / "People" filters mean what they say. Same
-- columns, same gate as before.

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
    case when p.role = 'roaster' then 'roaster' else 'person' end,
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

create or replace function public.search_profiles(p_query text, p_kind text default 'all')
returns table (
  username text,
  display_name text,
  account_type text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := lower(btrim(coalesce(p_query, '')));
  v_needle text;
  v_pattern text;
begin
  -- A leading @ is how people write usernames; it isn't part of one.
  v_query := ltrim(v_query, '@');

  -- Under two characters a search is a way to list everyone, not to find
  -- someone.
  if length(v_query) < 2 then
    return;
  end if;

  if p_kind not in ('all', 'person', 'roaster') then
    raise exception 'unknown kind' using errcode = '22023';
  end if;

  v_needle := extensions.unaccent('extensions.unaccent'::regdictionary, v_query);
  -- `_` is common in usernames and a wildcard to LIKE; match it literally.
  v_pattern := '%' || replace(replace(replace(v_needle, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    select p.username, p.display_name, case when p.role = 'roaster' then 'roaster' else 'person' end
    from public.profiles p
    where p.id <> auth.uid()
      and public.profile_is_visible_to_me(p.id)
      and (
        p_kind = 'all'
        or (p_kind = 'roaster' and p.role = 'roaster')
        or (p_kind = 'person' and p.role <> 'roaster')
      )
      and (
        p.username like v_pattern
        or lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p.display_name, ''))) like v_pattern
      )
    order by
      (p.username = v_needle) desc,
      starts_with(p.username, v_needle) desc,
      p.username
    limit 20;
end;
$$;

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
    case when v.visible then (case when p.role = 'roaster' then 'roaster' else 'person' end) end,
    b.created_at
  from public.profile_bookmarks b
  join public.profiles p on p.id = b.target_id
  cross join lateral (select public.profile_is_visible_to_me(p.id) as visible) v
  where b.user_id = auth.uid()
  order by b.created_at desc;
$$;
