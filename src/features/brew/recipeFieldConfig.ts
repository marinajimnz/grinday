import type { BrewMethod } from "@/features/equipment/constants";

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

export const RECIPE_FIELD_CONFIG: Record<BrewMethod, RecipeFieldConfig> = {
  espresso: {
    hasWater: false,
    hasDilutionWater: false,
    brewWeightMode: "required",
    timeLabelKey: "extractionTime",
    hasMoka: false,
    ratioDenominator: "targetWeightG",
  },
  v60: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "required",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  chemex: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  aeropress: {
    hasWater: true,
    hasDilutionWater: true,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  prensa: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "required",
    timeLabelKey: "steepTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  moka: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: true,
    ratioDenominator: "waterG",
  },
  // No spec was given for "Otros" — mirrors Chemex's shape (optional brew
  // weight) as the closest generic template.
  otros: {
    hasWater: true,
    hasDilutionWater: false,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
};

// "1:2" for a whole ratio, "1:16.7" when it isn't — never a forced
// trailing ".0".
export function formatRatio(ratio: number): string {
  const rounded = Math.round(ratio * 10) / 10;
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(1)}`;
}
