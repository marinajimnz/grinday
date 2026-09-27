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

describe("updateProfileSchema, public fields", () => {
  it("normalizes a handle typed with @, spaces or capitals", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina", handle: " @Marina_V60 " });
    expect(result.success && result.data.handle).toBe("marina_v60");
  });

  it("clears handle and bio when the fields are emptied", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina", handle: "", bio: "   " });
    expect(result.success && result.data).toMatchObject({ handle: null, bio: null });
  });

  it("leaves them out entirely when the form didn't send them", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina" });
    expect(result.success && result.data).toEqual({ displayName: "Marina", handle: undefined, bio: undefined });
  });

  it("rejects a handle outside 3-30 of [a-z0-9_]", () => {
    for (const handle of ["ab", "con espacio", "guion-medio", "tildé", "a".repeat(31)]) {
      const result = updateProfileSchema.safeParse({ displayName: "Marina", handle });
      expect(result.success, handle).toBe(false);
    }
  });

  it("rejects a bio over 160 characters", () => {
    const result = updateProfileSchema.safeParse({ displayName: "Marina", bio: "x".repeat(161) });
    expect(result.success).toBe(false);
  });
});

describe("setVisibilitySchema", () => {
  it("takes private on its own", () => {
    expect(setVisibilitySchema.safeParse({ visibility: "private" }).success).toBe(true);
  });

  it("takes public with or without a handle, normalizing it", () => {
    expect(setVisibilitySchema.safeParse({ visibility: "public" }).success).toBe(true);
    const result = setVisibilitySchema.safeParse({ visibility: "public", handle: "@Lucia" });
    expect(result.success && result.data).toEqual({ visibility: "public", handle: "lucia" });
  });

  it("never takes unset back", () => {
    expect(setVisibilitySchema.safeParse({ visibility: "unset" }).success).toBe(false);
  });
});
