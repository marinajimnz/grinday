-- The profile now shows four attempts and a "see more" that unfolds the
-- rest in place; five was too few for that to be worth a tap. Same
-- columns, same filters, same gate — only more rows.

-- The latest attempts (up to 12): method, day (in the app's time zone, never the
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
  limit 12;
$$;
