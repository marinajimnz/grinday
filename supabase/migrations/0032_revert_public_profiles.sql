-- Product decision: this app is not going to be a social network. Reverts
-- 0026-0029's schema (public-read RLS, follows, cloned_from_attempt_id)
-- back to the single-owner-only shape every table had before, without
-- rewriting the already-applied 0026-0030 migration files themselves (this
-- database is shared with other branches/sessions — editing history that's
-- already recorded as applied elsewhere is what caused the migration-
-- tracking mess earlier in this session; a new forward migration avoids
-- repeating that).
--
-- Deliberately left alone:
--   - profiles.is_public stays as an inert column (no policy reads it
--     anymore) — another branch's already-applied migration 0031 depends
--     on this column existing.
--   - The auth.uid() filters 0030 added to the stats/dashboard SQL
--     functions stay — correct regardless of how RLS is shaped, no reason
--     to remove them.

drop policy "profiles_select_public" on public.profiles;

drop policy "coffees_select_public" on public.coffees;
drop policy "coffees_select_own" on public.coffees;
drop policy "coffees_insert_own" on public.coffees;
drop policy "coffees_update_own" on public.coffees;
drop policy "coffees_delete_own" on public.coffees;
create policy "coffees_all_own"
  on public.coffees for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy "brew_attempts_select_public" on public.brew_attempts;
drop policy "brew_attempts_select_own" on public.brew_attempts;
drop policy "brew_attempts_insert_own" on public.brew_attempts;
drop policy "brew_attempts_update_own" on public.brew_attempts;
drop policy "brew_attempts_delete_own" on public.brew_attempts;
create policy "brew_attempts_all_own"
  on public.brew_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy "user_machines_select_public" on public.user_machines;
drop policy "user_machines_select_own" on public.user_machines;
drop policy "user_machines_insert_own" on public.user_machines;
drop policy "user_machines_update_own" on public.user_machines;
drop policy "user_machines_delete_own" on public.user_machines;
create policy "user_machines_all_own"
  on public.user_machines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy "user_grinders_select_public" on public.user_grinders;
drop policy "user_grinders_select_own" on public.user_grinders;
drop policy "user_grinders_insert_own" on public.user_grinders;
drop policy "user_grinders_update_own" on public.user_grinders;
drop policy "user_grinders_delete_own" on public.user_grinders;
create policy "user_grinders_all_own"
  on public.user_grinders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy "user_brew_equipment_select_public" on public.user_brew_equipment;
drop policy "user_brew_equipment_select_own" on public.user_brew_equipment;
drop policy "user_brew_equipment_insert_own" on public.user_brew_equipment;
drop policy "user_brew_equipment_update_own" on public.user_brew_equipment;
drop policy "user_brew_equipment_delete_own" on public.user_brew_equipment;
create policy "user_brew_equipment_all_own"
  on public.user_brew_equipment for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop table public.follows;

alter table public.brew_attempts drop column cloned_from_attempt_id;

alter table public.profiles alter column username drop not null;
alter table public.profiles drop column avatar_url;
alter table public.profiles drop column bio;

-- Restore the original handle_new_user() body — no username, which is what
-- required 0027's id-derived-placeholder fix; moot now that username is
-- optional again.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, is_anonymous)
  values (new.id, coalesce(new.is_anonymous, false));
  return new;
end;
$$;
