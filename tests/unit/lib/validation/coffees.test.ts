import { describe, expect, it } from "vitest";
import {
  bagFieldsSchema,
  coffeeFieldsSchema,
  createCoffeeAndBagSchema,
} from "@/lib/validation/coffees";

describe("coffeeFieldsSchema", () => {
  it("accepts the minimum required fields", () => {
    const result = coffeeFieldsSchema.safeParse({ name: "La Esperanza", roaster: "Tostador X" });
    expect(result.success).toBe(true);
  });

  it("requires name and roaster", () => {
    expect(coffeeFieldsSchema.safeParse({ name: "", roaster: "X" }).success).toBe(false);
    expect(coffeeFieldsSchema.safeParse({ name: "X", roaster: "" }).success).toBe(false);
  });

  it("treats an empty roastLevel select value as unset, not invalid", () => {
    const result = coffeeFieldsSchema.safeParse({
      name: "La Esperanza",
      roaster: "Tostador X",
      roastLevel: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.roastLevel).toBeUndefined();
  });

  it("rejects altitudeMin greater than altitudeMax", () => {
    const result = coffeeFieldsSchema.safeParse({
      name: "La Esperanza",
      roaster: "Tostador X",
      altitudeMinM: 2000,
      altitudeMaxM: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe("bagFieldsSchema", () => {
  it("defaults inventoryMode and status when omitted", () => {
    const result = bagFieldsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inventoryMode).toBe("none");
      expect(result.data.status).toBe("sealed");
    }
  });

  it("treats an empty date input as unset, not invalid", () => {
    const result = bagFieldsSchema.safeParse({ roastDate: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.roastDate).toBeUndefined();
  });

  it("rejects a malformed date", () => {
    const result = bagFieldsSchema.safeParse({ roastDate: "20/08/2026" });
    expect(result.success).toBe(false);
  });
});

describe("createCoffeeAndBagSchema", () => {
  it("accepts a full create-flow payload with an existingCoffeeId", () => {
    const result = createCoffeeAndBagSchema.safeParse({
      coffee: { name: "La Esperanza", roaster: "Tostador X" },
      bag: {},
      existingCoffeeId: "9c858901-8a57-4791-81fe-4c455b099bc9",
    });
    expect(result.success).toBe(true);
  });
});
