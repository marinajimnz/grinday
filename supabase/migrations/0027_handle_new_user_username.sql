-- 0026 made `profiles.username` not null, but `handle_new_user()` only ever
-- inserted (id, is_anonymous) — every new signup (registerAction's
-- createUser call) started failing the moment that constraint landed,
-- since the row is inserted before registerAction gets a chance to set the
-- real username. Give every new profile a placeholder derived from its own
-- id (guaranteed unique, always matches `^[a-z0-9_-]{3,20}$`); registration
-- immediately overwrites it with the username the user actually chose.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, is_anonymous, username)
  values (
    new.id,
    coalesce(new.is_anonymous, false),
    'user-' || substr(replace(new.id::text, '-', ''), 1, 12)
  );
  return new;
end;
$$;
