import { describe, expect, it } from "vitest";
import { getRecipeFieldConfig } from "@/features/brew/recipeFieldConfig";
import { BREW_METHODS, BREW_METHOD_CATEGORY } from "@/features/equipment/constants";

describe("getRecipeFieldConfig", () => {
  it("matches each existing method's current recipe shape exactly", () => {
    expect(getRecipeFieldConfig("espresso")).toEqual({
      hasWater: false,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "extractionTime",
      hasMoka: false,
      ratioDenominator: "targetWeightG",
    });
    expect(getRecipeFieldConfig("v60")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "brewTime",
      hasMoka: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("chemex")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("aeropress")).toEqual({
      hasWater: true,
      hasDilutionWater: true,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("prensa")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "steepTime",
      hasMoka: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("moka")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: true,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("otros")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      ratioDenominator: "waterG",
    });
  });

  it("gives methods sharing a category the same shape unless one is overridden", () => {
    // Chemex has no override, so it's exactly its category's default —
    // this is what a brand-new pour-over method would inherit for free.
    expect(BREW_METHOD_CATEGORY.chemex).toBe("pour_over");
    expect(getRecipeFieldConfig("chemex").brewWeightMode).toBe("optional");
    // V60 shares that category but needs its own override.
    expect(BREW_METHOD_CATEGORY.v60).toBe("pour_over");
    expect(getRecipeFieldConfig("v60").brewWeightMode).toBe("required");
  });

  it("assigns every known method a category", () => {
    for (const method of BREW_METHODS) {
      expect(BREW_METHOD_CATEGORY[method]).toBeDefined();
    }
  });
});
