-- brew_attempts: one logged espresso. Append-only in spirit ("historial
-- inmutable por defecto") — the app only ever inserts new rows or corrects
-- typos on an existing one, never overwrites on duplicate.
--
-- attempt_no is a per-coffee (not per-bag) sequential number, because the
-- UI and the spec's own examples ("intento #4") refer to attempts within a
-- coffee's history even when they span multiple bags/purchases.

create table public.brew_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  coffee_id uuid not null references public.coffees (id) on delete cascade,
  coffee_bag_id uuid not null references public.coffee_bags (id) on delete cascade,
  machine_id uuid not null references public.user_machines (id),
  parent_attempt_id uuid references public.brew_attempts (id) on delete set null,
  attempt_no int not null,

  grind_setting numeric,
  grind_seconds numeric,
  dose_mode text check (dose_mode in ('auto', 'manual')),
  dose_feedback text check (dose_feedback in ('under', 'ideal', 'over', 'unknown')),
  used_bit_more boolean not null default false,

  basket_size text check (basket_size in ('single', 'double')),
  basket_wall text check (basket_wall in ('single_wall', 'dual_wall')),

  temperature_offset_c smallint,
  upper_burr_setting smallint,

  shot_mode text check (shot_mode in ('single', 'double', 'manual')),
  extraction_ms int,
  preinfusion_ms int,
  pressure_observation text check (pressure_observation in ('low', 'espresso_range', 'high', 'unknown')),

  input_weight_g numeric,
  output_weight_g numeric,
  output_volume_ml numeric,

  acidity smallint check (acidity between 1 and 5),
  sweetness smallint check (sweetness between 1 and 5),
  bitterness smallint check (bitterness between 1 and 5),
  body smallint check (body between 1 and 5),
  intensity smallint check (intensity between 1 and 5),
  balance smallint check (balance between 1 and 5),
  overall_rating smallint check (overall_rating between 1 and 5),
  notes text,

  machine_snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (coffee_id, attempt_no)
);

create index brew_attempts_user_id_idx on public.brew_attempts (user_id, updated_at desc);
create index brew_attempts_coffee_id_idx on public.brew_attempts (coffee_id, created_at desc);
create index brew_attempts_coffee_bag_id_idx on public.brew_attempts (coffee_bag_id, created_at desc);
create index brew_attempts_parent_attempt_id_idx on public.brew_attempts (parent_attempt_id);

create trigger brew_attempts_set_updated_at
  before update on public.brew_attempts
  for each row execute function public.set_updated_at();

-- Auto-assign the per-coffee attempt number so callers never have to
-- coordinate it themselves.
create or replace function public.set_attempt_no()
returns trigger
language plpgsql
as $$
begin
  if new.attempt_no is null then
    select coalesce(max(attempt_no), 0) + 1 into new.attempt_no
      from public.brew_attempts
      where coffee_id = new.coffee_id;
  end if;
  return new;
end;
$$;

create trigger brew_attempts_set_attempt_no
  before insert on public.brew_attempts
  for each row execute function public.set_attempt_no();

alter table public.brew_attempts enable row level security;

create policy "brew_attempts_all_own"
  on public.brew_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Now that brew_attempts exists, wire the FK deferred since Fase 0/1 and
-- make sure a coffee can only prefer one of its own attempts.
alter table public.coffees
  add constraint coffees_preferred_attempt_fk
  foreign key (preferred_attempt_id) references public.brew_attempts (id) on delete set null;

create or replace function public.check_preferred_attempt_belongs_to_coffee()
returns trigger
language plpgsql
as $$
begin
  if new.preferred_attempt_id is not null then
    if not exists (
      select 1 from public.brew_attempts
      where id = new.preferred_attempt_id and coffee_id = new.id
    ) then
      raise exception 'preferred_attempt_id must belong to the same coffee';
    end if;
  end if;
  return new;
end;
$$;

create trigger coffees_check_preferred_attempt
  before insert or update of preferred_attempt_id on public.coffees
  for each row execute function public.check_preferred_attempt_belongs_to_coffee();

-- Atomic "mark/unmark preferred" — security invoker so RLS still applies.
create or replace function public.set_preferred_attempt(
  p_coffee_id uuid,
  p_attempt_id uuid
)
returns public.coffees
language plpgsql
security invoker
as $$
declare
  v_row public.coffees;
begin
  update public.coffees
    set preferred_attempt_id = p_attempt_id
    where id = p_coffee_id and user_id = auth.uid()
    returning * into v_row;

  if v_row.id is null then
    raise exception 'coffee not found or not owned by current user';
  end if;

  return v_row;
end;
$$;

grant execute on function public.set_preferred_attempt(uuid, uuid) to authenticated;
