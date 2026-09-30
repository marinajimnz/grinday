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
  // One cup or two. Only the espresso machine asks: it's the single/double
  // distinction its two baskets already make. Everywhere else the question
  // is answered by the water, or — on a moka pot — by mokaCupSize, which
  // goes to twelve.
  // How this method asks how many cups: two buttons, a typed number,
  // or not at all because moka_cup_size already said it ("pot").
  cupCountMode: "choice" | "manual" | "pot";
  // What the auto ratio is computed against: espresso ratios against the
  // beverage weight in the cup ("coffee/brew ratio"), every pour-over/
  // immersion method against the water poured in ("coffee/water ratio").
  ratioDenominator: "targetWeightG" | "waterG";
  // Espresso machines only: pressurized or non-pressurized basket, which
  // changes how fine the same dose has to be ground.
  hasBasketType: boolean;
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
    cupCountMode: "choice",
    ratioDenominator: "targetWeightG",
    hasBasketType: true,
  },
  // Modeled on Chemex: weighing the finished brew is nice to have but not
  // essential for most pour-over methods.
  pour_over: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    cupCountMode: "manual",
    ratioDenominator: "waterG",
    hasBasketType: false,
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
    cupCountMode: "manual",
    ratioDenominator: "waterG",
    hasBasketType: false,
  },
  moka_pot: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: true,
    cupCountMode: "pot",
    ratioDenominator: "waterG",
    hasBasketType: false,
  },
  other: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    cupCountMode: "manual",
    ratioDenominator: "waterG",
    hasBasketType: false,
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

// The one place the ratio is worked out, so the number you set in the
// recipe step, the one you correct on the result step, and the one you read
// back on the attempt can't drift apart. The caller decides what counts as
// the brew weight — the target while you're planning, what actually landed
// in the cup afterwards — because that's the only part that differs.
export function computeRatios(
  config: RecipeFieldConfig,
  values: {
    doseG?: number | null;
    waterG?: number | null;
    dilutionWaterG?: number | null;
    brewWeightG?: number | null;
  },
): { ratio?: number; brewRatio?: number } {
  const { doseG, waterG, dilutionWaterG, brewWeightG } = values;
  // Dilution water is still water, so it counts towards a coffee/water
  // ratio — and says nothing about an espresso measured against the cup.
  const hasDilution = config.hasDilutionWater && dilutionWaterG != null;
  const waterDenominator = hasDilution ? (waterG ?? 0) + dilutionWaterG : waterG;
  const denominator = config.ratioDenominator === "targetWeightG" ? brewWeightG : waterDenominator;
  return {
    ratio: doseG && denominator ? denominator / doseG : undefined,
    // Only worth showing separately when dilution actually moved it.
    brewRatio: hasDilution && doseG && waterG ? waterG / doseG : undefined,
  };
}

// "1:2" for a whole ratio, "1:16.7" when it isn't — never a forced
// trailing ".0".
export function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 10) / 10;
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(1)}`;
}
