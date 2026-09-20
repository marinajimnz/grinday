import { describe, expect, it } from "vitest";
import { requireEnv } from "@/lib/env";

describe("requireEnv", () => {
  it("returns the value when it's set", () => {
    expect(requireEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")).toBe(
      "https://example.supabase.co",
    );
  });

  it("names the missing variable instead of handing undefined onwards", () => {
    // The four Supabase clients used `process.env.X!`, so a missing variable
    // reached Supabase as undefined and failed there, with a message about a
    // URL rather than about the variable nobody defined.
    expect(() => requireEnv("SUPABASE_SERVICE_ROLE_KEY", undefined)).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY/,
    );
    expect(() => requireEnv("SUPABASE_SERVICE_ROLE_KEY", undefined)).toThrow(/\.env\.local/);
  });

  it("treats an empty string as missing", () => {
    // An unset variable in a deploy config is just as often "" as absent.
    expect(() => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")).toThrow();
  });
});
