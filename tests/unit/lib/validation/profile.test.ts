import { describe, expect, it } from "vitest";
import { setVisibilitySchema, updateProfileSchema } from "@/lib/validation/profile";

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

describe("updateProfileSchema, bio", () => {
  it("clears the bio when emptied", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina", bio: "   " });
    expect(result.success && result.data.bio).toBeNull();
  });

  it("leaves it out entirely when the form didn't send it", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina" });
    expect(result.success && result.data).toEqual({ displayName: "Marina", bio: undefined });
  });

  it("rejects a bio over 160 characters", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina", bio: "x".repeat(161) });
    expect(result.success).toBe(false);
  });
});

describe("setVisibilitySchema", () => {
  it("takes private or public", () => {
    expect(setVisibilitySchema.safeParse({ visibility: "private" }).success).toBe(true);
    expect(setVisibilitySchema.safeParse({ visibility: "public" }).success).toBe(true);
  });

  it("never takes unset back", () => {
    expect(setVisibilitySchema.safeParse({ visibility: "unset" }).success).toBe(false);
  });
});
