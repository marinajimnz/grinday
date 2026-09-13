-- Optional dual-burr grinder configuration for the live brew flow: some
-- grinders (e.g. Sage) expose two independent dials — one on the grinder
-- itself and one on the machine — instead of the single "grind_setting"
-- dial the rest of the app assumes. Kept separate from the pre-existing
-- upper_burr_setting/grind_setting columns (legacy, espresso-Sage-only
-- manual attempt form) so that form's behavior is untouched.

alter table public.brew_attempts
  add column grinder_upper_burr smallint check (grinder_upper_burr between 1 and 24),
  add column grinder_lower_burr smallint check (grinder_lower_burr between 1 and 24);
