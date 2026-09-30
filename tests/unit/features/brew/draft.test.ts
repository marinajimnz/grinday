import { beforeEach, describe, expect, it } from "vitest";
import {
  buildDraftFromRecipe,
  getMostRecentDraft,
  saveDraft,
  type BrewDraft,
  type RecipeSourceAttempt,
} from "@/features/brew/draft";

const baseParams = {
  coffeeId: "coffee-1",
  coffeeBagId: "bag-1",
  coffeeName: "La Esperanza",
  roaster: "Tostador X",
  method: "v60" as const,
};

describe("buildDraftFromRecipe", () => {
  it("seeds first-time defaults (for fields the method shows) when there is no source attempt", () => {
    const draft = buildDraftFromRecipe(baseParams);
    expect(draft.recipe).toEqual({
      method: "v60",
      doseG: 20,
      waterG: 320,
      targetWeightG: 40,
      temperatureC: 94,
      targetTimeMs: 27000,
      cupCount: 1,
    });
    expect(draft.parentAttemptId).toBeUndefined();
    expect(draft.startedAtEpochMs).toBeNull();
    expect(draft.stoppedAtEpochMs).toBeNull();
    expect(draft.extractionMs).toBeNull();
    expect(draft.draftId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("proposes one cup everywhere except the moka pot", () => {
    // Pre-selected, not blank: the recipe step proposes 20 g and 94 °C the
    // same way. Every attempt logged before the column existed has nothing
    // to recall, so without this the control would start empty for every
    // coffee already in the journal — and one cup is the honest guess,
    // which is also what the year's count reads a blank as.
    for (const method of ["espresso", "v60", "chemex", "aeropress", "prensa"] as const) {
      expect(buildDraftFromRecipe({ ...baseParams, method }).recipe.cupCount).toBe(1);
    }
    // The moka pot is asked once, as mokaCupSize, and not again here.
    expect(buildDraftFromRecipe({ ...baseParams, method: "moka" }).recipe.cupCount).toBeUndefined();
  });

  it("copies the recipe fields from the source attempt but not the outcome", () => {
    const source: RecipeSourceAttempt = {
      id: "attempt-1",
      attempt_no: 4,
      method: "v60",
      dose_g: 15,
      water_g: 250,
      dilution_water_g: null,
      target_weight_g: 240,
      temperature_c: 94,
      target_time_ms: 180000,
      grind_setting: 12,
      grinder_upper_burr: 8,
      grinder_lower_burr: 3,
      moka_cup_size: null,
      cup_count: null,
      heat_intensity: null,
      basket_type: null,
      equipment_id: "equip-1",
      grinder_id: "grinder-1",
      equipment_snapshot: { equipment_model_name: "Hario V60-02", grinder_model_name: "1Zpresso J-Ultra" },
    };

    const draft = buildDraftFromRecipe({ ...baseParams, sourceAttempt: source });

    expect(draft.parentAttemptId).toBe("attempt-1");
    expect(draft.parentAttemptNo).toBe(4);
    expect(draft.recipe).toEqual({
      method: "v60",
      doseG: 15,
      waterG: 250,
      targetWeightG: 240,
      temperatureC: 94,
      targetTimeMs: 180000,
      cupCount: 1,
      grinderUpperBurr: 8,
      grinderLowerBurr: 3,
      equipmentId: "equip-1",
      equipmentModelName: "Hario V60-02",
      grinderId: "grinder-1",
      grinderModelName: "1Zpresso J-Ultra",
    });
    // A fresh draft never inherits a previous shot's timing or sensory data.
    expect(draft.extractionMs).toBeNull();
    expect(draft.postShot).toEqual({});
  });

  it("recalls the espresso basket type, but never guesses one on a first brew", () => {
    expect(buildDraftFromRecipe({ ...baseParams, method: "espresso" }).recipe.basketType).toBeUndefined();

    const source = {
      id: "attempt-2",
      attempt_no: 1,
      method: "espresso",
      dose_g: 18,
      water_g: null,
      dilution_water_g: null,
      target_weight_g: 36,
      temperature_c: 93,
      target_time_ms: 28000,
      grind_setting: null,
      grinder_upper_burr: null,
      grinder_lower_burr: null,
      moka_cup_size: null,
      cup_count: 1,
      heat_intensity: null,
      basket_type: "pressurized",
      equipment_id: null,
      grinder_id: null,
      equipment_snapshot: {},
    } satisfies RecipeSourceAttempt;

    expect(
      buildDraftFromRecipe({ ...baseParams, method: "espresso", sourceAttempt: source }).recipe.basketType,
    ).toBe("pressurized");
    // A basket means nothing on a V60, and an unknown value is dropped.
    expect(buildDraftFromRecipe({ ...baseParams, sourceAttempt: source }).recipe.basketType).toBeUndefined();
    expect(
      buildDraftFromRecipe({
        ...baseParams,
        method: "espresso",
        sourceAttempt: { ...source, basket_type: "bottomless" },
      }).recipe.basketType,
    ).toBeUndefined();
  });

  it("prefers the silently-picked default equipment/grinder over the source attempt's", () => {
    const draft = buildDraftFromRecipe({
      ...baseParams,
      defaultEquipment: { id: "equip-2", model_name: "Hario V60-01" },
      defaultGrinder: { id: "grinder-2", model_name: "Comandante C40" },
    });

    expect(draft.recipe.equipmentId).toBe("equip-2");
    expect(draft.recipe.equipmentModelName).toBe("Hario V60-01");
    expect(draft.recipe.grinderId).toBe("grinder-2");
    expect(draft.recipe.grinderModelName).toBe("Comandante C40");
  });

  it("generates a fresh draftId each time", () => {
    const a = buildDraftFromRecipe(baseParams);
    const b = buildDraftFromRecipe(baseParams);
    expect(a.draftId).not.toBe(b.draftId);
  });
});

function makeDraft(overrides: Partial<BrewDraft>): BrewDraft {
  return {
    draftId: "draft-1",
    userId: "user-1",
    coffeeId: "coffee-1",
    coffeeBagId: "bag-1",
    coffeeName: "La Esperanza",
    roaster: "Tostador X",
    recipe: { method: "v60" },
    startedAtEpochMs: null,
    stoppedAtEpochMs: null,
    extractionMs: null,
    postShot: {},
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("getMostRecentDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ignores a draft still stuck in the recipe or timer step (never reached results)", () => {
    saveDraft(makeDraft({ draftId: "mid-flow", stoppedAtEpochMs: null }));
    expect(getMostRecentDraft("user-1")).toBeNull();
  });

  it("returns a draft that reached the result step and hasn't been saved", () => {
    saveDraft(makeDraft({ draftId: "at-results", stoppedAtEpochMs: Date.now() }));
    expect(getMostRecentDraft("user-1")?.draftId).toBe("at-results");
  });

  it("ignores drafts belonging to a different user", () => {
    saveDraft(makeDraft({ draftId: "someone-elses", userId: "user-2", stoppedAtEpochMs: Date.now() }));
    expect(getMostRecentDraft("user-1")).toBeNull();
  });

  it("picks the most recently created qualifying draft", () => {
    saveDraft(makeDraft({ draftId: "older", stoppedAtEpochMs: Date.now(), createdAt: 1 }));
    saveDraft(makeDraft({ draftId: "newer", stoppedAtEpochMs: Date.now(), createdAt: 2 }));
    expect(getMostRecentDraft("user-1")?.draftId).toBe("newer");
  });
});
