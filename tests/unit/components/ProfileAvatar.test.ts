import { describe, expect, it } from "vitest";
import { initialsFor } from "@/components/profile/ProfileAvatar";

describe("initialsFor", () => {
  it("takes the first letter of up to two words of the name", () => {
    expect(initialsFor("Lucía V60", "luciav60")).toBe("LV");
    expect(initialsFor("Marina", "marinajimnz")).toBe("M");
    expect(initialsFor("La Semilla Coffee Roasters", "lasemilla")).toBe("LS");
  });

  it("falls back to the username without a name", () => {
    expect(initialsFor(null, "diegoroast")).toBe("D");
    expect(initialsFor("   ", "diegoroast")).toBe("D");
  });
});
