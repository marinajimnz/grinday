export const DOSE_MODES = ["auto", "manual"] as const;

export const DOSE_FEEDBACKS = ["under", "ideal", "over", "unknown"] as const;

export const BASKET_SIZES = ["single", "double"] as const;

export const SHOT_MODES = ["single", "double", "manual"] as const;


export const TASTE_DIMENSIONS = [
  "acidity",
  "sweetness",
  "bitterness",
  "body",
  "intensity",
  "balance",
] as const;

export const HEAT_INTENSITIES = ["low", "medium", "high"] as const;

// How many cups a brew was made for. Descriptive only — it does not touch
// the dose, the water or the ratio, it records what the brew was for.
//
// Espresso picks one or two, because a third is a different drink; every
// other method types a number, because a French press for the table is
// four cups and nothing about the machine says so. The moka pot is the
// exception that asks nothing: moka_cup_size is already this number.
export const CUP_COUNTS = [1, 2] as const;
export const MAX_CUP_COUNT = 12;
export type CupCount = number;

export const MAX_COMPARE_ATTEMPTS = 4;
export const MIN_COMPARE_ATTEMPTS = 2;

export const ATTEMPT_MEDIA_KINDS = ["espresso", "setup", "other"] as const;

export type AttemptMediaKind = (typeof ATTEMPT_MEDIA_KINDS)[number];
