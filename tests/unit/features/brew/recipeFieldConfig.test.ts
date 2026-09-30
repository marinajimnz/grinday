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
      cupCountMode: "choice",
      ratioDenominator: "targetWeightG",
      hasBasketType: true,
    });
    expect(getRecipeFieldConfig("v60")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "brewTime",
      hasMoka: false,
      cupCountMode: "manual",
      ratioDenominator: "waterG",
      hasBasketType: false,
    });
    expect(getRecipeFieldConfig("chemex")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      cupCountMode: "manual",
      ratioDenominator: "waterG",
      hasBasketType: false,
    });
    expect(getRecipeFieldConfig("aeropress")).toEqual({
      hasWater: true,
      hasDilutionWater: true,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      cupCountMode: "manual",
      ratioDenominator: "waterG",
      hasBasketType: false,
    });
    expect(getRecipeFieldConfig("prensa")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "required",
      timeLabelKey: "steepTime",
      hasMoka: false,
      cupCountMode: "manual",
      ratioDenominator: "waterG",
      hasBasketType: false,
    });
    expect(getRecipeFieldConfig("moka")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: true,
      cupCountMode: "pot",
      ratioDenominator: "waterG",
      hasBasketType: false,
    });
    expect(getRecipeFieldConfig("otros")).toEqual({
      hasWater: true,
      hasDilutionWater: false,
      brewWeightMode: "optional",
      timeLabelKey: "brewTime",
      hasMoka: false,
      cupCountMode: "manual",
      ratioDenominator: "waterG",
      hasBasketType: false,
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

  it("asks how many cups everywhere, in the way each method can answer", () => {
    // Every method makes cups, and the year's count can't be right while
    // four of the five have nowhere to record them. But they don't answer
    // alike: espresso is one or two and never three, the moka pot already
    // said it with mokaCupSize, and the rest need a typed number because
    // nothing about the brew implies how many mugs it was poured into.
    for (const method of BREW_METHODS) {
      const category = BREW_METHOD_CATEGORY[method];
      const expected =
        category === "espresso_machine" ? "choice" : category === "moka_pot" ? "pot" : "manual";
      expect(getRecipeFieldConfig(method).cupCountMode).toBe(expected);
    }
  });

  it("never asks the moka pot twice", () => {
    // mokaCupSize and a cup count are the same number; showing both would
    // be two fields for one answer, and the stats would have to guess.
    const moka = getRecipeFieldConfig("moka");
    expect(moka.hasMoka).toBe(true);
    expect(moka.cupCountMode).toBe("pot");
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
