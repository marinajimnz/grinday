-- A coffee used to have exactly one favourite recipe: coffees.preferred_attempt_id,
-- a single column, so starring a second recipe silently unstarred the first. That
-- fits a coffee with one way of being brewed, and no coffee is like that — the same
-- beans go through the V60 on a weekday and the moka on Sunday, one cup or three,
-- and each of those is a recipe worth keeping and reproducing.
--
-- So the mark moves onto the attempt. Many favourites per coffee, ordered by when
-- they were marked.
alter table public.brew_attempts
  add column if not exists favourite_at timestamptz;

comment on column public.brew_attempts.favourite_at is
  'When this attempt was marked a favourite recipe; null means it is not one. '
  'Replaces coffees.preferred_attempt_id as the thing the user sets.';

-- What the favourites page asks for, and only that: one user's starred attempts,
-- most recently starred first. Partial, because the rows worth indexing are the few
-- that are not null.
create index if not exists brew_attempts_favourite_idx
  on public.brew_attempts (user_id, favourite_at desc)
  where favourite_at is not null;

-- Every recipe starred under the old model is a favourite under the new one. There
-- is no record of when it was starred, so the attempt's own creation time stands in:
-- it keeps a plausible order between them instead of collapsing every one of them
-- onto this migration's now().
update public.brew_attempts a
  set favourite_at = a.created_at
  from public.coffees c
  where c.preferred_attempt_id = a.id
    and a.favourite_at is null;

-- From here on coffees.preferred_attempt_id is derived, not set. It answers a
-- question that has not changed — "which one recipe represents this coffee" — for
-- the eight functions that read it: the stats summaries, the public profile header,
-- public coffees and roasters, the public coffee and attempt detail, and the recipe
-- source. They all keep working untouched; what changed is only who writes it.
--
-- Recomputed one coffee at a time from that coffee's own attempts, so the value can
-- only ever name an attempt belonging to it, which is exactly what the older
-- coffees_check_preferred_attempt trigger demands.
--
-- Statement level with a transition table rather than per row, because on delete the
-- foreign key's "on delete set null" is itself an after-row action: a per-row trigger
-- would race it and could be overwritten. After-row events all fire before
-- after-statement ones, so by the time this runs the null is already in place and the
-- recompute has the last word. Both triggers name their transition table "changed",
-- which is why one function serves the two of them.
--
-- It fires on every update of an attempt, not just on favourite_at: a trigger
-- carrying a column list cannot have a transition table at all. Which is why the
-- write is guarded — "is distinct from" and nothing happens when nothing changed.
-- Without that guard, correcting an attempt or rating it would touch its coffee's
-- updated_at through coffees_set_updated_at, and /brew/new orders the picker by
-- exactly that column: editing one attempt would quietly reshuffle the list.
create or replace function public.sync_coffee_preferred_attempt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.coffees c
    set preferred_attempt_id = favourite.attempt_id
    from (
      select
        affected.id as coffee_id,
        (
          select a.id
          from public.brew_attempts a
          where a.coffee_id = affected.id
            and a.favourite_at is not null
          order by a.favourite_at desc, a.attempt_no desc
          limit 1
        ) as attempt_id
      from public.coffees affected
      where affected.id in (select distinct coffee_id from changed)
    ) favourite
    where c.id = favourite.coffee_id
      and c.preferred_attempt_id is distinct from favourite.attempt_id;
  return null;
end;
$$;

-- A function only the triggers below have any business calling. It is security
-- definer so the recompute is not itself filtered by RLS, which makes who can call
-- it a real question — and the answer a new function gives by default is "anyone".
-- Postgres grants execute to PUBLIC, and this schema's default privileges grant it
-- to anon and authenticated on top, so revoking PUBLIC alone leaves it reachable
-- with the anon key; the exposure-surface snapshot is what caught that. All three
-- named here. Calling it outside a trigger could not work anyway, but a security
-- definer function should not be callable just because it would fail.
revoke execute on function public.sync_coffee_preferred_attempt()
  from public, anon, authenticated;

drop trigger if exists brew_attempts_sync_preferred_ins on public.brew_attempts;
create trigger brew_attempts_sync_preferred_ins
  after insert on public.brew_attempts
  referencing new table as changed
  for each statement execute function public.sync_coffee_preferred_attempt();

drop trigger if exists brew_attempts_sync_preferred_upd on public.brew_attempts;
create trigger brew_attempts_sync_preferred_upd
  after update on public.brew_attempts
  referencing new table as changed
  for each statement execute function public.sync_coffee_preferred_attempt();

drop trigger if exists brew_attempts_sync_preferred_del on public.brew_attempts;
create trigger brew_attempts_sync_preferred_del
  after delete on public.brew_attempts
  referencing old table as changed
  for each statement execute function public.sync_coffee_preferred_attempt();

-- Insert is covered too, although nothing in the app writes favourite_at on a new
-- attempt: repeating a recipe and trying someone else's both leave it null. The
-- guard makes that case free — same value in, no write out — and it means a future
-- path that does arrive starred cannot leave the cache behind.

-- Nobody sets the cache directly any more. Marking a favourite is a plain update on
-- the attempt, which RLS already restricts to its owner (brew_attempts_all_own), so
-- this function has nothing left to do.
drop function if exists public.set_preferred_attempt(uuid, uuid);
