-- "Muela superior" meant two different things at once.
--
-- The guided brew flow writes grinder_upper_burr (0025): the dial on a
-- dual-burr grinder, checked to 1..24, and the one the recipe card shows.
-- The manual attempt form had a field of its own writing
-- upper_burr_setting — a Sage-era column from 0009 with no range at all,
-- displayed further down the page under "Ajustes de la máquina". Same
-- label on two screens, two columns, and only one of them ever reaching
-- the card, so the same number could mean two things depending on which
-- form you happened to open.
--
-- Nothing is copied across on the way out. Across every account there is
-- exactly one row with upper_burr_setting set: 35, on a simulated demo
-- account whose grind_setting is 19. 35 is not a value grinder_upper_burr
-- can hold, which is the tell that these are two different scales rather
-- than one number stored twice — copying it would invent data and fail
-- the check constraint. That row keeps its grind_setting.
alter table public.brew_attempts
  drop column upper_burr_setting;
