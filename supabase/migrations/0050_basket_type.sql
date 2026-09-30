-- Espresso: whether the shot was pulled through a pressurized basket or a
-- non-pressurized one. It changes the recipe more than any other setting on
-- the machine — a pressurized basket forgives a coarse grind and builds its
-- own crema, a non-pressurized one needs the grind dialed in — so a recipe
-- is only repeatable (or worth trying on someone else's machine) when it
-- says which one it was.
--
-- Chosen per attempt rather than per machine: the same portafilter takes
-- both, and people switch between them. Optional, and null on everything
-- logged before the column existed.

alter table public.brew_attempts
  add column basket_type text
    check (basket_type in ('pressurized', 'non_pressurized'));

comment on column public.brew_attempts.basket_type is
  'Espresso only: pressurized or non_pressurized basket. Null when not recorded.';

-- get_public_attempt (0044) returns the recipe of a public attempt; the
-- basket is part of that recipe, so "Try this recipe" can carry it over.
-- The return type changes, which create or replace can't do.
drop function public.get_public_attempt(text, uuid);

create function public.get_public_attempt(p_username text, p_attempt_id uuid)
returns table (
  coffee_id uuid,
  coffee_name text,
  roaster text,
  is_preferred boolean,
  brewed_on date,
  method text,
  cup_count smallint,
  dose_g numeric,
  input_weight_g numeric,
  water_g numeric,
  dilution_water_g numeric,
  target_weight_g numeric,
  output_weight_g numeric,
  extraction_ms integer,
  temperature_c numeric,
  grind_setting numeric,
  grind_seconds numeric,
  grinder_upper_burr smallint,
  grinder_lower_burr smallint,
  moka_cup_size smallint,
  heat_intensity text,
  basket_type text,
  grinder_model_name text,
  equipment_model_name text,
  overall_rating smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.roaster,
    a.id is not distinct from c.preferred_attempt_id,
    (a.created_at at time zone 'Europe/Madrid')::date,
    a.method,
    a.cup_count,
    a.dose_g,
    a.input_weight_g,
    a.water_g,
    a.dilution_water_g,
    a.target_weight_g,
    a.output_weight_g,
    a.extraction_ms,
    a.temperature_c,
    a.grind_setting,
    a.grind_seconds,
    a.grinder_upper_burr,
    a.grinder_lower_burr,
    a.moka_cup_size,
    a.heat_intensity,
    a.basket_type,
    nullif(a.equipment_snapshot ->> 'grinder_model_name', ''),
    nullif(a.equipment_snapshot ->> 'equipment_model_name', ''),
    a.overall_rating
  from public.profiles p
  join public.brew_attempts a on a.user_id = p.id
  join public.coffees c on c.id = a.coffee_id and c.archived_at is null
  where p.username = lower(btrim(p_username))
    and a.id = p_attempt_id
    and (not a.hidden_from_dashboard or a.id = c.preferred_attempt_id)
    and public.profile_is_visible_to_me(p.id);
$$;

revoke execute on function public.get_public_attempt(text, uuid) from public, anon;
grant execute on function public.get_public_attempt(text, uuid) to authenticated;
