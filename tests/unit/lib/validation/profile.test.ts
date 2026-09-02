import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/lib/validation/profile";

describe("updateProfileSchema", () => {
  it("accepts a valid display name", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina" });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = updateProfileSchema.safeParse({ displayName: "  Marina  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBe("Marina");
  });

  it("rejects an empty name", () => {
    const result = updateProfileSchema.safeParse({ displayName: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 60 characters", () => {
    const result = updateProfileSchema.safeParse({ displayName: "a".repeat(61) });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
