-- Aeropress recipes often split water into what's used during the actual
-- infusion (brew water) and water added afterward to dilute (dilution
-- water) — the two need to stay distinct so both the "brew ratio" and the
-- "final coffee/water ratio" can be shown, per the method's own convention.
-- water_g keeps meaning "brew water"; this adds the optional second part.

alter table public.brew_attempts
  add column dilution_water_g numeric;
