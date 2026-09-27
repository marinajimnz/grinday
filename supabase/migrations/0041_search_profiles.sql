-- Search (plan F3): find public profiles by name or @username. Returns the
-- same kind of thing the profile header already shows — never more — and
-- only profiles that header would show (profile_is_visible_to_me).

-- "lucia" should find "Lucía".
create extension if not exists unaccent with schema extensions;

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
    select p.username, p.display_name, 'person'::text
    from public.profiles p
    where p.id <> auth.uid()
      and public.profile_is_visible_to_me(p.id)
      -- 'roaster' matches nothing until F6a adds the role.
      and p_kind in ('all', 'person')
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

revoke execute on function public.search_profiles(text, text) from public, anon;
grant execute on function public.search_profiles(text, text) to authenticated;
