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
