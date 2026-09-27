-- "Try this recipe" (plan F7). An attempt brewed from someone else's
-- public recipe remembers which attempt it came from — the attempt, not
-- the author's name — so the credit follows the author's own choices: while
-- their profile and that recipe are public it reads "Recipe by @them";
-- once either isn't, just "Copied recipe".

alter table public.brew_attempts
  add column recipe_source_attempt_id uuid
    references public.brew_attempts (id) on delete set null;

create index brew_attempts_recipe_source_idx
  on public.brew_attempts (recipe_source_attempt_id)
  where recipe_source_attempt_id is not null;

-- Where one of the caller's own attempts got its recipe. `available` is
-- false (and nothing else is returned) when the source is gone, or when
-- the author's profile or that recipe is no longer something the caller
-- could open — the same rule get_public_attempt applies.
create or replace function public.get_recipe_source(p_attempt_id uuid)
returns table (available boolean, username text, source_attempt_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select a.recipe_source_attempt_id as source_id
    from public.brew_attempts a
    where a.id = p_attempt_id
      and a.user_id = auth.uid()
      and a.recipe_source_attempt_id is not null
  ),
  source as (
    select p.username, s.id
    from mine
    join public.brew_attempts s on s.id = mine.source_id
    join public.coffees c on c.id = s.coffee_id and c.archived_at is null
    join public.profiles p on p.id = s.user_id
    where (not s.hidden_from_dashboard or s.id = c.preferred_attempt_id)
      and public.profile_is_visible_to_me(p.id)
  )
  select
    exists (select 1 from source),
    (select username from source),
    (select id from source)
  from mine;
$$;

revoke execute on function public.get_recipe_source(uuid) from public, anon;
grant execute on function public.get_recipe_source(uuid) to authenticated;
