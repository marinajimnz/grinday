-- Fase 8 (0026_public_profiles.sql) split coffees/brew_attempts' RLS from
-- one owner-only "for all" policy into select_own + select_public — so
-- these `security invoker` functions, written back in Fase 6/7 on the old
-- assumption that RLS alone scoped every result to the calling user, now
-- silently aggregate across every public profile's data instead of just
-- the caller's own. Redefining each with an explicit auth.uid() filter,
-- same as every hand-written query elsewhere in the app already needed
-- after that migration.

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
    and ba.user_id = auth.uid()
    and c.archived_at is null
    and (p_from is null or ba.created_at::date >= p_from)
    and (p_to is null or ba.created_at::date <= p_to)
  group by c.id, c.name, c.roaster, c.preferred_attempt_id
  having count(ba.overall_rating) >= 3
  order by avg(ba.overall_rating) desc
  limit 10;
$$;

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
      and ba.user_id = auth.uid()
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
    and ba.user_id = auth.uid()
    and c.archived_at is null
    and (p_from is null or ba.created_at::date >= p_from)
    and (p_to is null or ba.created_at::date <= p_to)
  group by ba.method
  having count(ba.overall_rating) >= 3
  order by avg(ba.overall_rating) desc;
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
      and ba.user_id = auth.uid()
      and c.archived_at is null
      and (p_from is null or ba.created_at::date >= p_from)
      and (p_to is null or ba.created_at::date <= p_to)
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
    and user_id = auth.uid()
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
    and user_id = auth.uid()
    and grind_setting is not null
    and (p_from is null or created_at::date >= p_from)
    and (p_to is null or created_at::date <= p_to)
  group by grind_setting
  order by grind_setting;
$$;

create or replace function public.dashboard_overview()
returns table (
  total_brews bigint,
  avg_rating numeric,
  favorite_method text
)
language sql
security invoker
stable
as $$
  select
    (select count(*) from public.brew_attempts where user_id = auth.uid()),
    (select round(avg(overall_rating), 1) from public.brew_attempts where overall_rating is not null and user_id = auth.uid()),
    (
      select method from public.brew_attempts
      where user_id = auth.uid()
      group by method
      order by count(*) desc, max(created_at) desc
      limit 1
    );
$$;
