import { describe, expect, it } from "vitest";
import { computeRatios, getRecipeFieldConfig } from "@/features/brew/recipeFieldConfig";
import { BREW_METHODS, BREW_METHOD_CATEGORY } from "@/features/equipment/constants";

describe("getRecipeFieldConfig", () => {
  it("matches each existing method's current recipe shape exactly", () => {
    expect(getRecipeFieldConfig("espresso")).toEqual({
      hasWater: false,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "extractionTime",
      hasMoka: false,
      hasCupCount: true,
      ratioDenominator: "targetWeightG",
    });
    expect(getRecipeFieldConfig("v60")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "brewTime",
      hasMoka: false,
      hasCupCount: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("chemex")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      hasCupCount: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("aeropress")).toEqual({
      hasWater: true,
      hasDilutionWater: true,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      hasCupCount: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("prensa")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "steepTime",
      hasMoka: false,
      hasCupCount: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("moka")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: true,
      hasCupCount: false,
      ratioDenominator: "waterG",
    });
    expect(getRecipeFieldConfig("otros")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      hasCupCount: false,
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

  it("asks how many cups on the espresso machine and nowhere else", () => {
    // The moka pot answers the same question with mokaCupSize (up to
    // twelve) and every brewing method answers it with the water, so a
    // one-or-two toggle would be a second, worse way to say it.
    for (const method of BREW_METHODS) {
      expect(getRecipeFieldConfig(method).hasCupCount).toBe(
        BREW_METHOD_CATEGORY[method] === "espresso_machine",
      );
    }
  });

  it("assigns every known method a category", () => {
    for (const method of BREW_METHODS) {
      expect(BREW_METHOD_CATEGORY[method]).toBeDefined();
    }
  });
});

describe("computeRatios", () => {
  it("measures an espresso against the cup, not against water it never poured", () => {
    const config = getRecipeFieldConfig("espresso");
    // 18 g in, 36 g out. hasWater is false for espresso, so a stray water_g
    // must not get a vote.
    expect(computeRatios(config, { doseG: 18, brewWeightG: 36, waterG: 500 }).ratio).toBe(2);
  });

  it("measures a pour-over against the water poured in", () => {
    const config = getRecipeFieldConfig("v60");
    const { ratio } = computeRatios(config, { doseG: 15, waterG: 250, brewWeightG: 230 });
    expect(ratio).toBeCloseTo(16.67, 2);
  });

  it("counts aeropress dilution water towards the final ratio and keeps the brew ratio apart", () => {
    const config = getRecipeFieldConfig("aeropress");
    const { ratio, brewRatio } = computeRatios(config, {
      doseG: 15,
      waterG: 100,
      dilutionWaterG: 125,
    });
    expect(ratio).toBeCloseTo(15, 5);
    // Before dilution it brewed strong — that's a different, useful number.
    expect(brewRatio).toBeCloseTo(6.67, 2);
  });

  it("leaves the brew ratio out when the method doesn't dilute", () => {
    const config = getRecipeFieldConfig("v60");
    expect(computeRatios(config, { doseG: 15, waterG: 250, dilutionWaterG: 50 }).brewRatio).toBeUndefined();
    // ...and that stray dilution doesn't move the ratio either.
    expect(computeRatios(config, { doseG: 15, waterG: 250, dilutionWaterG: 50 }).ratio).toBeCloseTo(16.67, 2);
  });

  it("returns nothing rather than zero or Infinity when a side is missing", () => {
    const config = getRecipeFieldConfig("espresso");
    expect(computeRatios(config, { doseG: null, brewWeightG: 36 }).ratio).toBeUndefined();
    expect(computeRatios(config, { doseG: 18, brewWeightG: null }).ratio).toBeUndefined();
    expect(computeRatios(config, { doseG: 0, brewWeightG: 36 }).ratio).toBeUndefined();
  });
});
