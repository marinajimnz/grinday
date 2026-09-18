-- The espresso-capability catalogue this app was first built around: a
-- curated machine_models table, a user's own instance of one in
-- user_machines, and a snapshot of both stamped onto every brew_attempt.
--
-- The 0020 equipment rework replaced it with user_grinders and
-- user_brew_equipment, and says in its own opening line that it is
-- independent of these tables — it carried nothing across. Nothing has
-- read machine_id or machine_snapshot since: no screen, no query, no
-- export. Nothing can even set a default machine any more, because
-- profiles.default_machine_id has never been written by any code in this
-- repo.
--
-- What the snapshots hold is not history worth keeping. Sixteen stamped
-- attempts share two distinct values between them: the Sage capability
-- JSON that sits in supabase/seed.sql verbatim, and
-- {"upper_burr_setting": null}. The nine user_machines rows have one
-- nickname between them and no settings at all.
--
-- Dropped in dependency order: the function returns a user_machines row,
-- brew_attempts and profiles point at that table, and it points at
-- machine_models.
--
-- The code that wrote these columns stopped in the commit before this
-- one. That has to be what is deployed before this migration runs, or
-- saving a brew fails the moment the columns go.

drop function if exists public.set_default_machine(uuid, text);

alter table public.brew_attempts
  drop column if exists machine_id,
  drop column if exists machine_snapshot;

alter table public.profiles
  drop column if exists default_machine_id;

drop table if exists public.user_machines;
drop table if exists public.machine_models;
