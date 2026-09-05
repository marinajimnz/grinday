import { BREW_METHOD_CATEGORY, type BrewMethod, type BrewMethodCategory } from "@/features/equipment/constants";

export type BrewWeightMode = "required" | "optional" | "hidden";

export type RecipeFieldConfig = {
  hasWater: boolean;
  // Aeropress-only: many recipes brew with little water and dilute
  // afterward, so it tracks brew water and dilution water separately —
  // the "final coffee/water ratio" uses their sum, the "brew ratio" uses
  // brew water alone.
  hasDilutionWater: boolean;
  brewWeightMode: BrewWeightMode;
  timeLabelKey: "extractionTime" | "brewTime" | "steepTime";
  hasMoka: boolean;
  // What the auto ratio is computed against: espresso ratios against the
  // beverage weight in the cup ("coffee/brew ratio"), every pour-over/
  // immersion method against the water poured in ("coffee/water ratio").
  ratioDenominator: "targetWeightG" | "waterG";
};

// One recipe shape per category — this is what a brand-new method inherits
// the moment it's tagged with a category in BREW_METHOD_CATEGORY, with no
// extra config needed. Each default below matches the method that
// currently best represents its category (see RECIPE_FIELD_CONFIG_OVERRIDES
// for the handful of methods that genuinely need something different).
const RECIPE_FIELD_CONFIG_DEFAULTS: Record<BrewMethodCategory, RecipeFieldConfig> = {
  espresso_machine: {
    hasWater: false,
    hasDilutionWater: false,
    brewWeightMode: "required",
    timeLabelKey: "extractionTime",
    hasMoka: false,
    ratioDenominator: "targetWeightG",
  },
  // Modeled on Chemex: weighing the finished brew is nice to have but not
  // essential for most pour-over methods.
  pour_over: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  // Modeled on the French press: steep for a set time, then weigh what you
  // poured. Aeropress overrides this — dilution and a shorter, optional
  // "brew time" are specific to it, not generic to immersion brewing.
  immersion: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "required",
    timeLabelKey: "steepTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  moka_pot: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: true,
    ratioDenominator: "waterG",
  },
  other: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
};

// Per-method exceptions to their category's default — only where a method
// genuinely brews differently from the rest of its category.
const RECIPE_FIELD_CONFIG_OVERRIDES: Partial<Record<BrewMethod, Partial<RecipeFieldConfig>>> = {
  v60: { brewWeightMode: "required" },
  aeropress: { hasDilutionWater: true, brewWeightMode: "optional", timeLabelKey: "brewTime" },
};

export function getRecipeFieldConfig(method: BrewMethod): RecipeFieldConfig {
  const category = BREW_METHOD_CATEGORY[method];
  return { ...RECIPE_FIELD_CONFIG_DEFAULTS[category], ...RECIPE_FIELD_CONFIG_OVERRIDES[method] };
}

// "1:2" for a whole ratio, "1:16.7" when it isn't — never a forced
// trailing ".0".
export function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 10) / 10;
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(1)}`;
}
