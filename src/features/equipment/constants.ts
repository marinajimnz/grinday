export const BREW_METHODS = [
  "espresso",
  "v60",
  "chemex",
  "aeropress",
  "prensa",
  "moka",
  "otros",
] as const;

export type BrewMethod = (typeof BREW_METHODS)[number];

// Groups methods that are brewed the same way, so a recipe's field shape
// (features/brew/recipeFieldConfig.ts) can be defined once per category
// instead of once per method. Adding a new method under an existing
// category — e.g. a new pour-over dripper — only needs an entry here; it
// inherits that category's recipe fields automatically unless it truly
// needs its own override.
export const BREW_METHOD_CATEGORIES = [
  "espresso_machine",
  "pour_over",
  "immersion",
  "moka_pot",
  "other",
] as const;

export type BrewMethodCategory = (typeof BREW_METHOD_CATEGORIES)[number];

export const BREW_METHOD_CATEGORY: Record<BrewMethod, BrewMethodCategory> = {
  espresso: "espresso_machine",
  v60: "pour_over",
  chemex: "pour_over",
  aeropress: "immersion",
  prensa: "immersion",
  moka: "moka_pot",
  otros: "other",
};
