-- The stats screen asked stats_by_dimension once per dimension: four
-- requests for one section. This answers all four in one, tagged with the
-- dimension each row belongs to. It calls stats_by_dimension itself, so the
-- ranking, the 3-rating minimum and the 8-row limit stay defined in one
-- place, and it is security invoker like the rest: RLS and auth.uid() see
-- the caller, as before.

create or replace function public.stats_by_dimensions(
  p_from date default null,
  p_to date default null,
  p_tz text default 'UTC'
)
returns table (
  dimension text,
  label text,
  avg_rating numeric,
  rated_count bigint
)
language sql
security invoker
stable
as $$
  select d.dimension, s.label, s.avg_rating, s.rated_count
  from unnest(array['country', 'process', 'roast_level', 'roaster']) with ordinality as d(dimension, position)
  cross join lateral public.stats_by_dimension(d.dimension, p_from, p_to, p_tz) with ordinality as s(label, avg_rating, rated_count, rank)
  order by d.position, s.rank;
$$;
