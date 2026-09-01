export const DOSE_MODES = ["auto", "manual"] as const;
export const DOSE_MODE_LABELS: Record<(typeof DOSE_MODES)[number], string> = {
  auto: "Automática",
  manual: "Manual",
};

export const DOSE_FEEDBACKS = ["under", "ideal", "over", "unknown"] as const;
export const DOSE_FEEDBACK_LABELS: Record<(typeof DOSE_FEEDBACKS)[number], string> = {
  under: "Por debajo",
  ideal: "Ideal",
  over: "Por encima",
  unknown: "No lo sé",
};

export const BASKET_SIZES = ["single", "double"] as const;
export const BASKET_SIZE_LABELS: Record<(typeof BASKET_SIZES)[number], string> = {
  single: "1 taza",
  double: "2 tazas",
};

export const BASKET_WALLS = ["single_wall", "dual_wall"] as const;
export const BASKET_WALL_LABELS: Record<(typeof BASKET_WALLS)[number], string> = {
  single_wall: "Pared simple",
  dual_wall: "Pared doble",
};

export const SHOT_MODES = ["single", "double", "manual"] as const;
export const SHOT_MODE_LABELS: Record<(typeof SHOT_MODES)[number], string> = {
  single: "1 taza",
  double: "2 tazas",
  manual: "Manual",
};

export const PRESSURE_OBSERVATIONS = ["low", "espresso_range", "high", "unknown"] as const;
export const PRESSURE_OBSERVATION_LABELS: Record<
  (typeof PRESSURE_OBSERVATIONS)[number],
  string
> = {
  low: "Baja",
  espresso_range: "Rango espresso",
  high: "Alta",
  unknown: "No observada",
};

export const TASTE_DIMENSIONS = [
  "acidity",
  "sweetness",
  "bitterness",
  "body",
  "intensity",
  "balance",
] as const;

export const TASTE_DIMENSION_LABELS: Record<(typeof TASTE_DIMENSIONS)[number], string> = {
  acidity: "Acidez",
  sweetness: "Dulzor",
  bitterness: "Amargor",
  body: "Cuerpo",
  intensity: "Intensidad",
  balance: "Balance",
};

export const MAX_COMPARE_ATTEMPTS = 4;
export const MIN_COMPARE_ATTEMPTS = 2;

export const ATTEMPT_MEDIA_KINDS = ["espresso", "setup", "other"] as const;
export const ATTEMPT_MEDIA_KIND_LABELS: Record<(typeof ATTEMPT_MEDIA_KINDS)[number], string> = {
  espresso: "Espresso",
  setup: "Setup",
  other: "Otra",
};
