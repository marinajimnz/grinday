import { describe, expect, it } from "vitest";
import { setDefaultMachineSchema } from "@/lib/validation/machines";

describe("setDefaultMachineSchema", () => {
  it("accepts a valid uuid", () => {
    const result = setDefaultMachineSchema.safeParse({
      machineModelId: "9c858901-8a57-4791-81fe-4c455b099bc9",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = setDefaultMachineSchema.safeParse({
      machineModelId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    const result = setDefaultMachineSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
