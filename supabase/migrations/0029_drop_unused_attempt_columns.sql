-- Five columns on brew_attempts that no longer have a way in or a way out.
--
-- Four of them are Sage Impress controls the manual attempt form kept
-- offering long after this became a multi-method brewing journal: a
-- pre-infusion timer, the pressure gauge reading, the volume in the cup,
-- and the "A Bit More" button. The guided flow has never written any of
-- them, and across twenty-five logged attempts not one holds a value —
-- used_bit_more has never once been true. The form stopped offering them
-- in the commit before this, which is deployed.
--
-- basket_wall is different: it has fifteen values and had no reference
-- anywhere in the app. The field was taken out of the UI and the column
-- was left behind holding data no screen could show, so those fifteen go
-- with it rather than sitting there unreadable.
--
-- Deliberately left alone: tds_percent, moka_cup_size, dilution_water_g
-- and heat_intensity are just as empty, and they stay. They are empty
-- because this journal has been brewing espresso, not because nothing
-- collects them — the guided flow asks for every one of them the moment a
-- moka pot or an aeropress is the method.

alter table public.brew_attempts
  drop column if exists preinfusion_ms,
  drop column if exists pressure_observation,
  drop column if exists output_volume_ml,
  drop column if exists used_bit_more,
  drop column if exists basket_wall;
