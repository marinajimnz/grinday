export const DOSE_MODES = ["auto", "manual"] as const;

export const DOSE_FEEDBACKS = ["under", "ideal", "over", "unknown"] as const;

export const BASKET_SIZES = ["single", "double"] as const;

export const SHOT_MODES = ["single", "double", "manual"] as const;

export const PRESSURE_OBSERVATIONS = ["low", "espresso_range", "high", "unknown"] as const;

export const TASTE_DIMENSIONS = [
  "acidity",
  "sweetness",
  "bitterness",
  "body",
  "intensity",
  "balance",
] as const;

export const HEAT_INTENSITIES = ["low", "medium", "high"] as const;

export const MAX_COMPARE_ATTEMPTS = 4;
export const MIN_COMPARE_ATTEMPTS = 2;

export const ATTEMPT_MEDIA_KINDS = ["espresso", "setup", "other"] as const;
