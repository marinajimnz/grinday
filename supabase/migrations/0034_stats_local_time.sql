-- Every stats function compared `created_at::date`, which is the date in
-- UTC. Marina brews in Spain, so a coffee made at 00:30 on the 1st was
-- filed under the 31st — and with the new screen bucketing by day, that
-- stopped being a rounding error and became a wrong bar.
--
-- So each function takes the zone to read dates in. The default is UTC,
-- which is what they did before; the app passes STATS_TIME_ZONE on every
-- call, so the period's boundaries and the bars inside it agree.
--
-- Adding a parameter makes a new signature rather than replacing the old
-- one, which would leave two overloads and an ambiguous call — hence the
-- drops.

drop function if exists public.stats_by_coffee(date, date);
drop function if exists public.stats_by_dimension(text, date, date);
drop function if exists public.stats_by_method(date, date);
drop function if exists public.stats_frequent_notes(numeric, date, date);
drop function if exists public.stats_extraction_seconds_distribution(date, date);
drop function if exists public.stats_grind_setting_distribution(date, date);
drop function if exists public.stats_cup_totals(date, date);
drop function if exists public.stats_cups_by_bucket(date, date, text);
drop function if exists public.stats_period_highlights(date, date);

create or replace function public.stats_by_coffee(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
returns table (
  coffee_id uuid,
  name text,
  roaster text,
  avg_rating numeric,
  rated_count bigint,
  has_preferred boolean
)
language sql
security invoker
stable
as $$
  select
    c.id,
    c.name,
    c.roaster,
    round(avg(ba.overall_rating), 2),
    count(ba.overall_rating),
    c.preferred_attempt_id is not null
  from public.coffees c
  join public.brew_attempts ba on ba.coffee_id = c.id
  where ba.overall_rating is not null
    and ba.user_id = auth.uid()
    and c.archived_at is null
    and (p_from is null or (ba.created_at at time zone p_tz)::date >= p_from)
    and (p_to is null or (ba.created_at at time zone p_tz)::date <= p_to)
  group by c.id, c.name, c.roaster, c.preferred_attempt_id
  having count(ba.overall_rating) >= 3
  order by avg(ba.overall_rating) desc
  limit 10;
$$;

create or replace function public.stats_by_dimension(
  p_dimension text,
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
returns table (
  label text,
  avg_rating numeric,
  rated_count bigint
)
language plpgsql
security invoker
stable
as $$
begin
  if p_dimension not in ('country', 'process', 'roast_level', 'roaster') then
    raise exception 'invalid dimension: %', p_dimension;
  end if;

  return query
  select grouped.label, round(avg(grouped.rating), 2), count(grouped.rating)
  from (
    select
      case p_dimension
        when 'country' then c.country
        when 'process' then c.process
        when 'roast_level' then c.roast_level
        when 'roaster' then c.roaster
      end as label,
      ba.overall_rating as rating
    from public.coffees c
    join public.brew_attempts ba on ba.coffee_id = c.id
    where ba.overall_rating is not null
      and ba.user_id = auth.uid()
      and c.archived_at is null
      and (p_from is null or (ba.created_at at time zone p_tz)::date >= p_from)
      and (p_to is null or (ba.created_at at time zone p_tz)::date <= p_to)
  ) grouped
  where grouped.label is not null
  group by grouped.label
  having count(grouped.rating) >= 3
  order by avg(grouped.rating) desc
  limit 8;
end;
$$;

create or replace function public.stats_by_method(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
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
    and ba.user_id = auth.uid()
    and c.archived_at is null
    and (p_from is null or (ba.created_at at time zone p_tz)::date >= p_from)
    and (p_to is null or (ba.created_at at time zone p_tz)::date <= p_to)
  group by ba.method
  having count(ba.overall_rating) >= 3
  order by avg(ba.overall_rating) desc;
$$;

create or replace function public.stats_frequent_notes(
  p_min_rating numeric default 4,
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
returns table (
  note text,
  coffee_count bigint
)
language sql
security invoker
stable
as $$
  with qualifying_coffees as (
    select c.id
    from public.coffees c
    join public.brew_attempts ba on ba.coffee_id = c.id
    where ba.overall_rating is not null
      and ba.user_id = auth.uid()
      and c.archived_at is null
      and (p_from is null or (ba.created_at at time zone p_tz)::date >= p_from)
      and (p_to is null or (ba.created_at at time zone p_tz)::date <= p_to)
    group by c.id
    having count(ba.overall_rating) >= 3 and avg(ba.overall_rating) >= p_min_rating
  )
  select unnest(c.tasting_notes) as note, count(distinct c.id) as coffee_count
  from public.coffees c
  join qualifying_coffees qc on qc.id = c.id
  where c.user_id = auth.uid()
  group by note
  order by coffee_count desc, note
  limit 10;
$$;

create or replace function public.stats_extraction_seconds_distribution(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
returns table (
  bucket_seconds int,
  attempt_count bigint
)
language sql
security invoker
stable
as $$
  select round(extraction_ms / 1000.0)::int as bucket_seconds, count(*)
  from public.brew_attempts
  where overall_rating is not null
    and user_id = auth.uid()
    and extraction_ms is not null
    and (p_from is null or (created_at at time zone p_tz)::date >= p_from)
    and (p_to is null or (created_at at time zone p_tz)::date <= p_to)
  group by bucket_seconds
  order by bucket_seconds;
$$;

create or replace function public.stats_grind_setting_distribution(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
returns table (
  grind_setting numeric,
  attempt_count bigint
)
language sql
security invoker
stable
as $$
  select grind_setting, count(*)
  from public.brew_attempts
  where overall_rating is not null
    and user_id = auth.uid()
    and grind_setting is not null
    and (p_from is null or (created_at at time zone p_tz)::date >= p_from)
    and (p_to is null or (created_at at time zone p_tz)::date <= p_to)
  group by grind_setting
  order by grind_setting;
$$;

create or replace function public.stats_cup_totals(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
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
    and (p_from is null or (ba.created_at at time zone p_tz)::date >= p_from)
    and (p_to is null or (ba.created_at at time zone p_tz)::date <= p_to);
$$;

create or replace function public.stats_cups_by_bucket(
  p_from date,
  p_to date,
  p_bucket text default 'day',
  p_tz text default 'UTC'
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
    date_trunc(p_bucket, ba.created_at at time zone p_tz)::date,
    sum(coalesce(ba.cup_count, ba.moka_cup_size, 1))::bigint
  from public.brew_attempts ba
  where ba.user_id = auth.uid()
    and (ba.created_at at time zone p_tz)::date >= p_from
    and (ba.created_at at time zone p_tz)::date <= p_to
  group by 1
  order by 1;
end;
$$;

create or replace function public.stats_period_highlights(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
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
      and (p_from is null or (ba.created_at at time zone p_tz)::date >= p_from)
      and (p_to is null or (ba.created_at at time zone p_tz)::date <= p_to)
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
