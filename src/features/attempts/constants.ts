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

// How many cups an espresso was pulled for. Descriptive only — picking two
// does not touch the dose, the water or the ratio, it records what the shot
// was for. Espresso alone asks: the moka pot answers the same question with
// moka_cup_size, which goes to twelve, and a pour-over answers it with the
// water.
export const CUP_COUNTS = [1, 2] as const;
export type CupCount = (typeof CUP_COUNTS)[number];

export const MAX_COMPARE_ATTEMPTS = 4;
export const MIN_COMPARE_ATTEMPTS = 2;

export const ATTEMPT_MEDIA_KINDS = ["espresso", "setup", "other"] as const;

export type AttemptMediaKind = (typeof ATTEMPT_MEDIA_KINDS)[number];
