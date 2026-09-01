-- Fase 6: descriptive-only aggregations, computed in Postgres so the client
-- never downloads the full attempt history (§9.3). All functions are
-- security invoker — RLS on coffees/brew_attempts still scopes every result
-- to the calling user automatically, no explicit user_id filter needed here.
--
-- "datos insuficientes" (§7.8, n < 3 recomendado) is enforced with
-- `having count(...) >= 3` inside each grouped function, so an unreliable
-- small sample never reaches the UI at all — no judgment call for the
-- frontend to get wrong.

create or replace function public.stats_by_coffee(p_from date default null, p_to date default null)
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
    and c.archived_at is null
    and (p_from is null or ba.created_at::date >= p_from)
    and (p_to is null or ba.created_at::date <= p_to)
  group by c.id, c.name, c.roaster, c.preferred_attempt_id
  having count(ba.overall_rating) >= 3
  order by avg(ba.overall_rating) desc
  limit 10;
$$;

-- p_dimension is validated against a fixed allowlist and only ever used
-- inside a `case` expression (never string-concatenated into SQL), so this
-- stays injection-safe despite being "dynamic".
create or replace function public.stats_by_dimension(
  p_dimension text,
  p_from date default null,
  p_to date default null
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
      and c.archived_at is null
      and (p_from is null or ba.created_at::date >= p_from)
      and (p_to is null or ba.created_at::date <= p_to)
  ) grouped
  where grouped.label is not null
  group by grouped.label
  having count(grouped.rating) >= 3
  order by avg(grouped.rating) desc
  limit 8;
end;
$$;

create or replace function public.stats_frequent_notes(
  p_min_rating numeric default 4,
  p_from date default null,
  p_to date default null
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
      and c.archived_at is null
      and (p_from is null or ba.created_at::date >= p_from)
      and (p_to is null or ba.created_at::date <= p_to)
    group by c.id
    having count(ba.overall_rating) >= 3 and avg(ba.overall_rating) >= p_min_rating
  )
  select unnest(c.tasting_notes) as note, count(distinct c.id) as coffee_count
  from public.coffees c
  join qualifying_coffees qc on qc.id = c.id
  group by note
  order by coffee_count desc, note
  limit 10;
$$;

create or replace function public.stats_extraction_seconds_distribution(
  p_from date default null,
  p_to date default null
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
    and extraction_ms is not null
    and (p_from is null or created_at::date >= p_from)
    and (p_to is null or created_at::date <= p_to)
  group by bucket_seconds
  order by bucket_seconds;
$$;

create or replace function public.stats_grind_setting_distribution(
  p_from date default null,
  p_to date default null
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
    and grind_setting is not null
    and (p_from is null or created_at::date >= p_from)
    and (p_to is null or created_at::date <= p_to)
  group by grind_setting
  order by grind_setting;
$$;

grant execute on function public.stats_by_coffee(date, date) to authenticated;
grant execute on function public.stats_by_dimension(text, date, date) to authenticated;
grant execute on function public.stats_frequent_notes(numeric, date, date) to authenticated;
grant execute on function public.stats_extraction_seconds_distribution(date, date) to authenticated;
grant execute on function public.stats_grind_setting_distribution(date, date) to authenticated;
