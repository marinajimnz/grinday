-- Equipment inventory: user-owned grinders and per-method brew equipment.
-- Independent from machine_models/user_machines (the admin-curated espresso
-- capability catalog used for the brew_attempts snapshot) — this is a
-- free-form inventory the user fills in themselves, not wired into brewing
-- logic.

create table public.user_grinders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  model_name text not null,
  created_at timestamptz not null default now()
);

create index user_grinders_user_id_idx on public.user_grinders (user_id, created_at);

alter table public.user_grinders enable row level security;

create policy "user_grinders_all_own"
  on public.user_grinders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.user_brew_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  method text not null
    check (method in ('espresso', 'v60', 'chemex', 'aeropress', 'prensa', 'moka', 'otros')),
  model_name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index user_brew_equipment_user_id_idx
  on public.user_brew_equipment (user_id, method, created_at);

-- Only one default per method per user.
create unique index user_brew_equipment_one_default_per_method
  on public.user_brew_equipment (user_id, method)
  where is_default;

alter table public.user_brew_equipment enable row level security;

create policy "user_brew_equipment_all_own"
  on public.user_brew_equipment for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Atomic "select default equipment" operation, scoped to the target row's
-- own method (mirrors set_default_machine in 0005_set_default_machine_rpc.sql).
create or replace function public.set_default_equipment(p_equipment_id uuid)
returns public.user_brew_equipment
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_method text;
  v_row public.user_brew_equipment;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select method into v_method
    from public.user_brew_equipment
    where id = p_equipment_id and user_id = v_user_id;

  if v_method is null then
    raise exception 'equipment not found';
  end if;

  update public.user_brew_equipment
    set is_default = false
    where user_id = v_user_id and method = v_method and is_default = true;

  update public.user_brew_equipment
    set is_default = true
    where id = p_equipment_id
    returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.set_default_equipment(uuid) to authenticated;
