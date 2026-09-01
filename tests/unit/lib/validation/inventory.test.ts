import { describe, expect, it } from "vitest";
import { adjustInventorySchema } from "@/lib/validation/inventory";

describe("adjustInventorySchema", () => {
  it("accepts a valid correction", () => {
    const result = adjustInventorySchema.safeParse({
      coffeeBagId: "9c858901-8a57-4791-81fe-4c455b099bc9",
      newRemainingG: 120,
      note: "Pesado de nuevo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative remaining amount", () => {
    const result = adjustInventorySchema.safeParse({
      coffeeBagId: "9c858901-8a57-4791-81fe-4c455b099bc9",
      newRemainingG: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero (bag fully empty)", () => {
    const result = adjustInventorySchema.safeParse({
      coffeeBagId: "9c858901-8a57-4791-81fe-4c455b099bc9",
      newRemainingG: 0,
    });
    expect(result.success).toBe(true);
  });

  it("treats an empty note as unset", () => {
    const result = adjustInventorySchema.safeParse({
      coffeeBagId: "9c858901-8a57-4791-81fe-4c455b099bc9",
      newRemainingG: 50,
      note: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBeUndefined();
  });
});
