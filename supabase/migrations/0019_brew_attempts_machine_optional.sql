-- Starting a brew no longer requires a default machine configured — for now,
-- machine_id is optional on brew_attempts so a user can log a shot before
-- ever visiting Ajustes → Máquinas. machine_snapshot already defaults to
-- '{}'::jsonb, so it stays consistent when there's no machine to snapshot.

alter table public.brew_attempts
  alter column machine_id drop not null;
