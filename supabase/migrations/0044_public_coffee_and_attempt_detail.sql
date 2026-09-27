-- Opening a coffee or an attempt from a public profile. Same gate as
-- everything public (profile_is_visible_to_me), explicit column lists, and
-- the same things left out: notes, photos, bags, inventory, archived
-- coffees, attempts hidden from Home and the time of day.
--
-- To link to them, the lists now carry the coffee's and the attempt's id.
-- Those are random UUIDs: holding one grants nothing — every function
-- below re-checks that it belongs to a profile the caller may see. The
-- account's own id still never goes out.

drop function public.get_public_coffees(text);

create function public.get_public_coffees(p_username text)
returns table (
  id uuid,
  name text,
  roaster text,
  country text,
  process text,
  has_recipe boolean,
  recipe_method text,
  recipe_grind text
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
    c.country,
    c.process,
    a.id is not null,
    a.method,
    public.attempt_grind_label(a.grind_setting, a.grinder_upper_burr, a.grinder_lower_burr)
  from public.profiles p
  join public.coffees c on c.user_id = p.id and c.archived_at is null
  left join public.brew_attempts a on a.id = c.preferred_attempt_id
  where p.username = lower(btrim(p_username))
    and public.profile_is_visible_to_me(p.id)
  order by (a.id is not null) desc, c.updated_at desc
  limit 24;
$$;

drop function public.get_public_recent_attempts(text);

create function public.get_public_recent_attempts(p_username text)
returns table (
  id uuid,
  brewed_on date,
  method text,
  coffee_name text,
  roaster text,
  cup_count smallint,
  dose_g numeric,
  water_g numeric,
  dilution_water_g numeric,
  target_weight_g numeric,
  output_weight_g numeric,
  extraction_ms integer,
  grind text,
  overall_rating smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    -- Same zone as APP_TIME_ZONE in src/lib/time.ts.
    (a.created_at at time zone 'Europe/Madrid')::date,
    a.method,
    c.name,
    c.roaster,
    a.cup_count,
    a.dose_g,
    a.water_g,
    a.dilution_water_g,
    a.target_weight_g,
    a.output_weight_g,
    a.extraction_ms,
    public.attempt_grind_label(a.grind_setting, a.grinder_upper_burr, a.grinder_lower_burr),
    a.overall_rating
  from public.profiles p
  join public.brew_attempts a on a.user_id = p.id and not a.hidden_from_dashboard
  join public.coffees c on c.id = a.coffee_id and c.archived_at is null
  where p.username = lower(btrim(p_username))
    and public.profile_is_visible_to_me(p.id)
  order by a.created_at desc
  limit 12;
$$;

-- One coffee's facts: where it's from, how it was processed and roasted,
-- and what it tastes of — the product, not the owner's bags of it.
create function public.get_public_coffee(p_username text, p_coffee_id uuid)
returns table (
  name text,
  roaster text,
  country text,
  region text,
  farm text,
  producer text,
  varieties text[],
  process text,
  altitude_min_m integer,
  altitude_max_m integer,
  roast_level text,
  tasting_notes text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.name, c.roaster, c.country, c.region, c.farm, c.producer, c.varieties,
    c.process, c.altitude_min_m, c.altitude_max_m, c.roast_level, c.tasting_notes
  from public.profiles p
  join public.coffees c on c.user_id = p.id and c.archived_at is null
  where p.username = lower(btrim(p_username))
    and c.id = p_coffee_id
    and public.profile_is_visible_to_me(p.id);
$$;

-- The attempts shown on a coffee: its latest four (not hidden from Home)
-- plus its preferred recipe, flagged, wherever it falls — the owner pinned
-- that one on purpose, the way Home keeps showing it.
create function public.get_public_coffee_attempts(p_username text, p_coffee_id uuid)
returns table (
  id uuid,
  is_preferred boolean,
  brewed_on date,
  method text,
  cup_count smallint,
  dose_g numeric,
  water_g numeric,
  dilution_water_g numeric,
  target_weight_g numeric,
  output_weight_g numeric,
  extraction_ms integer,
  grind text,
  overall_rating smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  with coffee as (
    select c.id, c.preferred_attempt_id
    from public.profiles p
    join public.coffees c on c.user_id = p.id and c.archived_at is null
    where p.username = lower(btrim(p_username))
      and c.id = p_coffee_id
      and public.profile_is_visible_to_me(p.id)
  ),
  latest as (
    select a.id
    from coffee
    join public.brew_attempts a on a.coffee_id = coffee.id and not a.hidden_from_dashboard
    order by a.created_at desc
    limit 4
  )
  select
    a.id,
    a.id is not distinct from coffee.preferred_attempt_id,
    (a.created_at at time zone 'Europe/Madrid')::date,
    a.method,
    a.cup_count,
    a.dose_g,
    a.water_g,
    a.dilution_water_g,
    a.target_weight_g,
    a.output_weight_g,
    a.extraction_ms,
    public.attempt_grind_label(a.grind_setting, a.grinder_upper_burr, a.grinder_lower_burr),
    a.overall_rating
  from coffee
  join public.brew_attempts a on a.coffee_id = coffee.id
  where a.id in (select id from latest) or a.id = coffee.preferred_attempt_id
  order by a.created_at desc;
$$;

-- One attempt's configuration: everything needed to brew it again, and its
-- rating. Reachable for any attempt of a visible coffee that isn't hidden
-- from Home, or that is the coffee's preferred recipe. Never the notes,
-- photos or tasting scores, never the bag.
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

revoke execute on function public.get_public_coffees(text) from public, anon;
revoke execute on function public.get_public_recent_attempts(text) from public, anon;
revoke execute on function public.get_public_coffee(text, uuid) from public, anon;
revoke execute on function public.get_public_coffee_attempts(text, uuid) from public, anon;
revoke execute on function public.get_public_attempt(text, uuid) from public, anon;
grant execute on function public.get_public_coffees(text) to authenticated;
grant execute on function public.get_public_recent_attempts(text) to authenticated;
grant execute on function public.get_public_coffee(text, uuid) to authenticated;
grant execute on function public.get_public_coffee_attempts(text, uuid) to authenticated;
grant execute on function public.get_public_attempt(text, uuid) to authenticated;
