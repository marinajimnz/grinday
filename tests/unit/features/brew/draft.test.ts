import { describe, expect, it } from "vitest";
import { buildDraftFromRecipe, type RecipeSourceAttempt } from "@/features/brew/draft";

const baseParams = {
  coffeeId: "coffee-1",
  coffeeBagId: "bag-1",
  coffeeName: "La Esperanza",
  roaster: "Tostador X",
};

describe("buildDraftFromRecipe", () => {
  it("starts blank with no timer state when there is no source attempt", () => {
    const draft = buildDraftFromRecipe(baseParams);
    expect(draft.recipe).toEqual({});
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
      grind_setting: 12,
      grind_seconds: 14.8,
      dose_mode: "auto",
      basket_size: "double",
      basket_wall: "dual_wall",
      temperature_offset_c: 1,
      upper_burr_setting: 6,
      shot_mode: "double",
      preinfusion_ms: 3000,
    };

    const draft = buildDraftFromRecipe({ ...baseParams, sourceAttempt: source });

    expect(draft.parentAttemptId).toBe("attempt-1");
    expect(draft.parentAttemptNo).toBe(4);
    expect(draft.recipe).toEqual({
      grindSetting: 12,
      grindSeconds: 14.8,
      doseMode: "auto",
      basketSize: "double",
      basketWall: "dual_wall",
      temperatureOffsetC: 1,
      upperBurrSetting: 6,
      shotMode: "double",
      preinfusionMs: 3000,
    });
    // A fresh draft never inherits a previous shot's timing or sensory data.
    expect(draft.extractionMs).toBeNull();
    expect(draft.postShot).toEqual({});
  });

  it("generates a fresh draftId each time", () => {
    const a = buildDraftFromRecipe(baseParams);
    const b = buildDraftFromRecipe(baseParams);
    expect(a.draftId).not.toBe(b.draftId);
  });
});
