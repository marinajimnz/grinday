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
  it("accepts the minimum required Sage fields", () => {
    const result = attemptFieldsSchema.safeParse(validAttempt);
    expect(result.success).toBe(true);
  });

  it("requires grindSetting, grindSeconds, doseMode, basketSize and shotMode", () => {
    const keys = ["grindSetting", "grindSeconds", "doseMode", "basketSize", "shotMode"] as const;
    for (const key of keys) {
      const rest: Partial<typeof validAttempt> = { ...validAttempt };
      delete rest[key];
      expect(attemptFieldsSchema.safeParse(rest).success).toBe(false);
    }
  });

  it("treats an empty enum select value as unset, not invalid", () => {
    const result = attemptFieldsSchema.safeParse({
      ...validAttempt,
      doseFeedback: "",
      basketWall: "",
      pressureObservation: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.doseFeedback).toBeUndefined();
      expect(result.data.basketWall).toBeUndefined();
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
