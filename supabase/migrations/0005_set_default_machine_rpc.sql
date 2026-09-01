-- Atomic "select default machine" operation: unsets any previous default,
-- reuses an existing user_machines row for that model if one exists (so we
-- don't create duplicates when the user just re-selects the same machine),
-- and points profiles.default_machine_id at it. Runs as the calling user
-- (security invoker) so RLS still applies — no privilege escalation.

create or replace function public.set_default_machine(
  p_machine_model_id uuid,
  p_nickname text default null
)
returns public.user_machines
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.user_machines;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.user_machines
    set is_default = false
    where user_id = v_user_id and is_default = true;

  select * into v_row
    from public.user_machines
    where user_id = v_user_id and machine_model_id = p_machine_model_id
    limit 1;

  if v_row.id is null then
    insert into public.user_machines (user_id, machine_model_id, nickname, is_default)
    values (v_user_id, p_machine_model_id, p_nickname, true)
    returning * into v_row;
  else
    update public.user_machines
      set is_default = true
      where id = v_row.id
      returning * into v_row;
  end if;

  update public.profiles set default_machine_id = v_row.id where id = v_user_id;

  return v_row;
end;
$$;

grant execute on function public.set_default_machine(uuid, text) to authenticated;
