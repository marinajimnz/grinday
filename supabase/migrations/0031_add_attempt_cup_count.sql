-- How many cups the shot was pulled for: one or two.
--
-- A label, not a lever — it changes nothing about the dose, the water or
-- the ratio, which is exactly why it needs somewhere to live. Without it
-- a 36 g double and a 36 g single are the same row, and the journal can't
-- tell you which of the two the good one was.
--
-- Espresso only, so far: it's the single/double distinction every machine
-- with two baskets already makes. The moka pot answers the same question
-- with moka_cup_size, which goes to twelve, and pour-overs answer it with
-- the water.
--
-- Null is the honest value for the twenty-five attempts already logged and
-- for every method that doesn't ask. The check tolerates it: a null never
-- fails a check constraint.

alter table public.brew_attempts
  add column if not exists cup_count smallint check (cup_count in (1, 2));

comment on column public.brew_attempts.cup_count is
  'Cups the espresso was pulled for (1 or 2). Descriptive only: it does not scale the recipe.';
