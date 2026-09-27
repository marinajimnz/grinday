-- What a public profile shows below its header (plan F4): coffees, the
-- models of the equipment, and the latest attempts. Same rules as the
-- header (0040): only through these functions, only for a profile
-- profile_is_visible_to_me() lets through, explicit column lists, no ids.
--
-- Left out on purpose, everywhere: notes, photos, bags, inventory, drafts,
-- archived coffees, attempts hidden from Home ("Quitar del inicio"), which
-- piece of equipment is the default, and the time of day of any attempt.

-- The grind of an attempt as one short label: the single dial when there
-- is one, both burrs of a dual-burr grinder otherwise ("12·8").
create or replace function public.attempt_grind_label(
  p_grind_setting numeric,
  p_upper smallint,
  p_lower smallint
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_grind_setting is not null then trim_scale(p_grind_setting)::text
    when p_upper is not null and p_lower is not null then p_upper || '·' || p_lower
    else coalesce(p_upper, p_lower)::text
  end;
$$;

revoke execute on function public.attempt_grind_label(numeric, smallint, smallint) from public, anon, authenticated;

-- Coffees that aren't archived, those with a preferred recipe first. For
-- the recipe only its method and grind: enough for the card; the full
-- recipe comes with its own page (F7).
create or replace function public.get_public_coffees(p_username text)
returns table (
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

-- Model names only. `kind` is 'grinder' or the brew method the equipment
-- is for.
create or replace function public.get_public_equipment(p_username text)
returns table (
  kind text,
  model_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.kind, e.model_name
  from public.profiles p
  cross join lateral (
    select 'grinder'::text as kind, g.model_name, g.created_at, 0 as ord
      from public.user_grinders g where g.user_id = p.id
    union all
    select b.method, b.model_name, b.created_at, 1
      from public.user_brew_equipment b where b.user_id = p.id
  ) e
  where p.username = lower(btrim(p_username))
    and public.profile_is_visible_to_me(p.id)
  order by e.ord, e.created_at;
$$;

-- The latest attempts: method, day (in the app's time zone, never the
-- time), coffee, the numbers of the recipe and the rating.
create or replace function public.get_public_recent_attempts(p_username text)
returns table (
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
  limit 5;
$$;

revoke execute on function public.get_public_coffees(text) from public, anon;
revoke execute on function public.get_public_equipment(text) from public, anon;
revoke execute on function public.get_public_recent_attempts(text) from public, anon;
grant execute on function public.get_public_coffees(text) to authenticated;
grant execute on function public.get_public_equipment(text) to authenticated;
grant execute on function public.get_public_recent_attempts(text) to authenticated;
