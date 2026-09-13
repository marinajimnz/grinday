import { describe, expect, it } from "vitest";
import { attemptFieldsSchema, createAttemptSchema } from "@/lib/validation/attempts";

const validAttempt = {
  grindSetting: 12,
  grindSeconds: 14.8,
  doseMode: "auto",
  basketSize: "double",
  shotMode: "double",
};

describe("attemptFieldsSchema", () => {
  it("accepts the legacy Sage fields (kept for the manual/edit attempt form)", () => {
    const result = attemptFieldsSchema.safeParse(validAttempt);
    expect(result.success).toBe(true);
  });

  it("requires nothing — every field, including grindSetting, is optional", () => {
    expect(attemptFieldsSchema.safeParse({}).success).toBe(true);
    const keys = ["grindSetting", "grindSeconds", "doseMode", "basketSize", "shotMode"] as const;
    for (const key of keys) {
      const rest: Partial<typeof validAttempt> = { ...validAttempt };
      delete rest[key];
      expect(attemptFieldsSchema.safeParse(rest).success).toBe(true);
    }
  });

  it("accepts an optional grinder burr configuration within 1-24", () => {
    const result = attemptFieldsSchema.safeParse({
      ...validAttempt,
      grinderUpperBurr: 8,
      grinderLowerBurr: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.grinderUpperBurr).toBe(8);
      expect(result.data.grinderLowerBurr).toBe(3);
    }
  });

  it("rejects a grinder burr setting outside 1-24", () => {
    expect(
      attemptFieldsSchema.safeParse({ ...validAttempt, grinderUpperBurr: 25 }).success,
    ).toBe(false);
    expect(
      attemptFieldsSchema.safeParse({ ...validAttempt, grinderLowerBurr: 0 }).success,
    ).toBe(false);
  });

  it("accepts the new generic multi-method recipe fields", () => {
    const result = attemptFieldsSchema.safeParse({
      grindSetting: 12,
      method: "v60",
      doseG: 15,
      waterG: 250,
      targetWeightG: 240,
      temperatureC: 94,
      targetTimeMs: 180000,
      tdsPercent: 1.35,
      wouldBrewAgain: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown method", () => {
    const result = attemptFieldsSchema.safeParse({ grindSetting: 12, method: "syphon" });
    expect(result.success).toBe(false);
  });

  it("treats an empty enum select value as unset, not invalid", () => {
    const result = attemptFieldsSchema.safeParse({
      ...validAttempt,
      doseFeedback: "",
      pressureObservation: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.doseFeedback).toBeUndefined();
      expect(result.data.pressureObservation).toBeUndefined();
    }
  });

  it("rejects a sensory rating outside 1-5", () => {
    expect(attemptFieldsSchema.safeParse({ ...validAttempt, overallRating: 6 }).success).toBe(
      false,
    );
  });

  it("defaults usedBitMore to false", () => {
    const result = attemptFieldsSchema.safeParse(validAttempt);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.usedBitMore).toBe(false);
  });
});

describe("createAttemptSchema", () => {
  it("accepts a duplicate payload with a parentAttemptId", () => {
    const result = createAttemptSchema.safeParse({
      coffeeBagId: "9c858901-8a57-4791-81fe-4c455b099bc9",
      parentAttemptId: "6ee44ebd-5791-41fd-bb36-e9d1175eda35",
      attempt: validAttempt,
    });
    expect(result.success).toBe(true);
  });
});
