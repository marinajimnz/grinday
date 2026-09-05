import { describe, expect, it } from "vitest";
import {
  addBrewEquipmentBatchSchema,
  addGrinderSchema,
  removeGrinderSchema,
  setDefaultBrewEquipmentSchema,
} from "@/lib/validation/equipment";

describe("addGrinderSchema", () => {
  it("accepts a trimmed model name", () => {
    const result = addGrinderSchema.safeParse({ modelName: "  Comandante C40  " });
    expect(result.success).toBe(true);
  });

  it("rejects an empty model name", () => {
    const result = addGrinderSchema.safeParse({ modelName: "   " });
    expect(result.success).toBe(false);
  });
});

describe("removeGrinderSchema", () => {
  it("rejects a non-uuid id", () => {
    const result = removeGrinderSchema.safeParse({ grinderId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("addBrewEquipmentBatchSchema", () => {
  it("accepts one or more methods with at least one model each", () => {
    const result = addBrewEquipmentBatchSchema.safeParse({
      entries: [
        { method: "espresso", modelNames: ["Sage Barista Express Impress"] },
        { method: "v60", modelNames: ["Hario V60-02", "Hario V60-01"] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown method", () => {
    const result = addBrewEquipmentBatchSchema.safeParse({
      entries: [{ method: "syphon", modelNames: ["Something"] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a method with no models", () => {
    const result = addBrewEquipmentBatchSchema.safeParse({
      entries: [{ method: "moka", modelNames: [] }],
    });
    expect(result.success).toBe(false);
  });
});

describe("setDefaultBrewEquipmentSchema", () => {
  it("accepts a valid uuid", () => {
    const result = setDefaultBrewEquipmentSchema.safeParse({
      equipmentId: "9c858901-8a57-4791-81fe-4c455b099bc9",
    });
    expect(result.success).toBe(true);
  });
});
