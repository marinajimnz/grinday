-- Extensions and shared helpers used by every later migration.

create extension if not exists "pgcrypto";

-- Generic updated_at trigger, reused by every table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
