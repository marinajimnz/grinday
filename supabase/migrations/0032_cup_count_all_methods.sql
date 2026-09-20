-- cup_count arrived with espresso, where the only sane answers are one or
-- two, and the column said so. Every other method makes cups too — a V60
-- into two mugs, a French press for the table — and the year's "how many
-- coffees did you make" can't be answered while four methods out of five
-- have nowhere to record it.
--
-- So the choice becomes a number. Twelve is the ceiling because that's
-- what the largest moka pot makes, and moka keeps answering this question
-- with moka_cup_size rather than growing a second field that means the
-- same thing.
alter table public.brew_attempts
  drop constraint if exists brew_attempts_cup_count_check;

alter table public.brew_attempts
  add constraint brew_attempts_cup_count_check
  check (cup_count is null or (cup_count >= 1 and cup_count <= 12));

comment on column public.brew_attempts.cup_count is
  'How many cups this brew was made for. Descriptive only: it does not scale the dose, the water or the ratio. Espresso picks one or two, other methods type a number, and the moka pot answers with moka_cup_size instead. Null on everything logged before the column existed, which the stats read as one.';
