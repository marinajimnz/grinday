import type { BrewMethod } from "@/features/equipment/constants";

export type BrewWeightMode = "required" | "optional" | "hidden";

export type RecipeFieldConfig = {
  hasWater: boolean;
  brewWeightMode: BrewWeightMode;
  timeLabelKey: "extractionTime" | "brewTime" | "steepTime";
  hasMoka: boolean;
  // What the auto ratio is computed against: espresso ratios against the
  // beverage weight in the cup, every pour-over/immersion method against
  // the water poured in.
  ratioDenominator: "targetWeightG" | "waterG";
};

export const RECIPE_FIELD_CONFIG: Record<BrewMethod, RecipeFieldConfig> = {
  espresso: {
    hasWater: false,
    brewWeightMode: "required",
    timeLabelKey: "extractionTime",
    hasMoka: false,
    ratioDenominator: "targetWeightG",
  },
  v60: {
    hasWater: true,
    brewWeightMode: "required",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  chemex: {
    hasWater: true,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  aeropress: {
    hasWater: true,
    brewWeightMode: "hidden",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  prensa: {
    hasWater: true,
    brewWeightMode: "required",
    timeLabelKey: "steepTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
  moka: {
    hasWater: true,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: true,
    ratioDenominator: "waterG",
  },
  // No spec was given for "Otros" — mirrors Chemex's shape (optional brew
  // weight) as the closest generic template.
  otros: {
    hasWater: true,
    brewWeightMode: "optional",
    timeLabelKey: "brewTime",
    hasMoka: false,
    ratioDenominator: "waterG",
  },
};
