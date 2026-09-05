import { describe, expect, it } from "vitest";
import { buildDraftFromRecipe, type RecipeSourceAttempt } from "@/features/brew/draft";

const baseParams = {
  coffeeId: "coffee-1",
  coffeeBagId: "bag-1",
  coffeeName: "La Esperanza",
  roaster: "Tostador X",
  method: "v60" as const,
};

describe("buildDraftFromRecipe", () => {
  it("starts blank (but with the chosen method) when there is no source attempt", () => {
    const draft = buildDraftFromRecipe(baseParams);
    expect(draft.recipe).toEqual({ method: "v60" });
    expect(draft.parentAttemptId).toBeUndefined();
    expect(draft.startedAtEpochMs).toBeNull();
    expect(draft.stoppedAtEpochMs).toBeNull();
    expect(draft.extractionMs).toBeNull();
    expect(draft.draftId).toMatch(/^[0-9a-f-]{36}$/);
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
      moka_cup_size: null,
      heat_intensity: null,
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
      grindSetting: 12,
      equipmentId: "equip-1",
      equipmentModelName: "Hario V60-02",
      grinderId: "grinder-1",
      grinderModelName: "1Zpresso J-Ultra",
    });
    // A fresh draft never inherits a previous shot's timing or sensory data.
    expect(draft.extractionMs).toBeNull();
    expect(draft.postShot).toEqual({});
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
