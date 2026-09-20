-- The stats page used to be six lists of average ratings, every one of
-- them hidden until three attempts had been scored. These three functions
-- answer a different question — how much coffee did you actually make —
-- which needs no ratings at all and works from the very first brew.
--
-- Two deliberate differences from the rating functions above:
--
--  * Archived coffees count. Archiving a coffee you finished shouldn't
--    delete it from the year you drank it in.
--  * A null cup_count reads as one cup. Everything logged before the
--    column existed is null, and one is the honest floor: you made at
--    least one cup, or you wouldn't have logged it. The moka pot answers
--    with moka_cup_size, which is the same number by another name.
create or replace function public.stats_cup_totals(
  p_from date default null,
  p_to date default null
)
returns table (cups bigint, brews bigint)
language sql
security invoker
stable
as $$
  select
    coalesce(sum(coalesce(ba.cup_count, ba.moka_cup_size, 1)), 0)::bigint,
    count(*)::bigint
  from public.brew_attempts ba
  where ba.user_id = auth.uid()
    and (p_from is null or ba.created_at::date >= p_from)
    and (p_to is null or ba.created_at::date <= p_to);
$$;

-- The bars. 'day' for a week or a month, 'month' for a year — the caller
-- decides which, because only it knows what period it asked for. Empty
-- buckets are absent rather than zero: the page draws the whole axis and
-- fills in what comes back, so it doesn't matter, and generate_series here
-- would be a lot of machinery for a row of twelve rectangles.
create or replace function public.stats_cups_by_bucket(
  p_from date,
  p_to date,
  p_bucket text default 'day'
)
returns table (bucket_start date, cups bigint)
language plpgsql
security invoker
stable
as $$
begin
  if p_bucket not in ('day', 'month') then
    raise exception 'invalid bucket: %', p_bucket;
  end if;

  return query
  select
    date_trunc(p_bucket, ba.created_at)::date,
    sum(coalesce(ba.cup_count, ba.moka_cup_size, 1))::bigint
  from public.brew_attempts ba
  where ba.user_id = auth.uid()
    and ba.created_at::date >= p_from
    and ba.created_at::date <= p_to
  group by 1
  order by 1;
end;
$$;

-- The four cards under the bars, as one row so the page makes one call.
-- "Favourite" means most brewed, not best scored — the best score is its
-- own card, and a coffee you rated 5 once is not the one you reach for.
create or replace function public.stats_period_highlights(
  p_from date default null,
  p_to date default null
)
returns table (
  top_method text,
  top_method_brews bigint,
  top_roast text,
  top_roast_brews bigint,
  best_coffee_id uuid,
  best_coffee_name text,
  best_coffee_rating numeric,
  top_coffee_id uuid,
  top_coffee_name text,
  top_coffee_brews bigint
)
language sql
security invoker
stable
as $$
  with mine as (
    select ba.*, c.roast_level, c.name as coffee_name
    from public.brew_attempts ba
    join public.coffees c on c.id = ba.coffee_id
    where ba.user_id = auth.uid()
      and (p_from is null or ba.created_at::date >= p_from)
      and (p_to is null or ba.created_at::date <= p_to)
  ),
  method as (
    select m.method as label, count(*) as n
    from mine m
    where m.method is not null
    group by m.method
    order by n desc, label
    limit 1
  ),
  roast as (
    select m.roast_level as label, count(*) as n
    from mine m
    where m.roast_level is not null
    group by m.roast_level
    order by n desc, label
    limit 1
  ),
  best as (
    select m.coffee_id as id, m.coffee_name as name, round(avg(m.overall_rating), 2) as rating
    from mine m
    where m.overall_rating is not null
    group by m.coffee_id, m.coffee_name
    order by rating desc, count(*) desc, name
    limit 1
  ),
  repeated as (
    select m.coffee_id as id, m.coffee_name as name, count(*) as n
    from mine m
    group by m.coffee_id, m.coffee_name
    order by n desc, name
    limit 1
  )
  select
    (select label from method), (select n from method),
    (select label from roast), (select n from roast),
    (select id from best), (select name from best), (select rating from best),
    (select id from repeated), (select name from repeated), (select n from repeated);
$$;
