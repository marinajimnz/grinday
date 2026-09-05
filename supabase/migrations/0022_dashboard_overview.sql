-- Aggregate numbers for the redesigned Inicio dashboard: total brews logged,
-- average overall rating, and the most-brewed method ("favorito"). One
-- round trip instead of three separate count/avg/group-by queries.

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
    (select count(*) from public.brew_attempts),
    (select round(avg(overall_rating), 1) from public.brew_attempts where overall_rating is not null),
    (
      select method from public.brew_attempts
      group by method
      order by count(*) desc, max(created_at) desc
      limit 1
    );
$$;

grant execute on function public.dashboard_overview() to authenticated;
