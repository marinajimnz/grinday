-- attempt_no needs a column-level default so generated TypeScript types mark
-- it optional on insert. The trigger now always overwrites it server-side,
-- so a client can never spoof the sequence — it's computed, not supplied.

alter table public.brew_attempts alter column attempt_no set default 0;

create or replace function public.set_attempt_no()
returns trigger
language plpgsql
as $$
begin
  select coalesce(max(attempt_no), 0) + 1 into new.attempt_no
    from public.brew_attempts
    where coffee_id = new.coffee_id;
  return new;
end;
$$;
