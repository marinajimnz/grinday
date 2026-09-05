-- Brings brew_attempts in line with the new multi-method equipment
-- inventory (0020_equipment.sql): every method (not just the Sage espresso
-- machine) can now be logged, with a generic recipe (dose/water/brew
-- weight/temperature/time/grind) instead of the old basket/shot-mode/
-- preinfusion fields, which stay untouched on already-logged attempts.

-- A grinder can now be starred as default too, same pattern as
-- user_brew_equipment's per-method default.
alter table public.user_grinders
  add column is_default boolean not null default false;

create unique index user_grinders_one_default_per_user
  on public.user_grinders (user_id)
  where is_default;

create or replace function public.set_default_grinder(p_grinder_id uuid)
returns public.user_grinders
language plpgsql
security invoker
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.user_grinders;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.user_grinders
    set is_default = false
    where user_id = v_user_id and is_default = true;

  update public.user_grinders
    set is_default = true
    where id = p_grinder_id and user_id = v_user_id
    returning * into v_row;

  if v_row.id is null then
    raise exception 'grinder not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.set_default_grinder(uuid) to authenticated;

-- New generic recipe columns. `method` defaults every existing row (all of
-- them logged before this feature existed) to 'espresso', which is
-- accurate — that's the only method the app supported until now.
alter table public.brew_attempts
  add column method text not null default 'espresso'
    check (method in ('espresso', 'v60', 'chemex', 'aeropress', 'prensa', 'moka', 'otros')),
  add column dose_g numeric,
  add column water_g numeric,
  add column target_weight_g numeric,
  add column temperature_c numeric,
  add column target_time_ms int,
  add column tds_percent numeric,
  add column would_brew_again boolean,
  add column moka_cup_size smallint,
  add column heat_intensity text check (heat_intensity in ('low', 'medium', 'high')),
  add column equipment_id uuid references public.user_brew_equipment (id) on delete set null,
  add column grinder_id uuid references public.user_grinders (id) on delete set null,
  add column equipment_snapshot jsonb not null default '{}'::jsonb;

-- Rating-by-method breakdown for Estadísticas, same shape/threshold as
-- stats_by_dimension in 0013_stats_functions.sql.
create or replace function public.stats_by_method(p_from date default null, p_to date default null)
returns table (
  method text,
  avg_rating numeric,
  rated_count bigint
)
language sql
security invoker
stable
as $$
  select
    ba.method,
    round(avg(ba.overall_rating), 2),
    count(ba.overall_rating)
  from public.brew_attempts ba
  join public.coffees c on c.id = ba.coffee_id
  where ba.overall_rating is not null
    and c.archived_at is null
    and (p_from is null or ba.created_at::date >= p_from)
    and (p_to is null or ba.created_at::date <= p_to)
  group by ba.method
  having count(ba.overall_rating) >= 3
  order by avg(ba.overall_rating) desc;
$$;

grant execute on function public.stats_by_method(date, date) to authenticated;
