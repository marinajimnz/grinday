import { describe, expect, it } from "vitest";
import { formatRemaining } from "@/features/inventory/format";

describe("formatRemaining", () => {
  it("shows 'Sin seguimiento' when inventory_mode is none", () => {
    expect(
      formatRemaining({ inventory_mode: "none", remaining_g: 100, estimated_dose_g: null }),
    ).toBe("Sin seguimiento");
  });

  it("shows 'Sin seguimiento' when remaining_g hasn't been seeded yet", () => {
    expect(
      formatRemaining({ inventory_mode: "manual_grams", remaining_g: null, estimated_dose_g: null }),
    ).toBe("Sin seguimiento");
  });

  it("shows a plain gram figure for manual_grams (scale-tracked, not approximate)", () => {
    const result = formatRemaining({
      inventory_mode: "manual_grams",
      remaining_g: 187.4,
      estimated_dose_g: null,
    });
    expect(result).toBe("187 g");
    expect(result).not.toContain("aprox");
  });

  it("labels approximate_shots as 'aprox.' and includes a shot estimate", () => {
    const result = formatRemaining({
      inventory_mode: "approximate_shots",
      remaining_g: 144,
      estimated_dose_g: 18,
    });
    expect(result).toContain("aprox.");
    expect(result).toBe("aprox. 8 shots (~144 g)");
  });

  it("falls back to grams-only aprox. when no estimated dose is set", () => {
    const result = formatRemaining({
      inventory_mode: "approximate_shots",
      remaining_g: 144,
      estimated_dose_g: null,
    });
    expect(result).toBe("aprox. 144 g");
  });

  it("uses singular 'shot' for exactly one remaining", () => {
    const result = formatRemaining({
      inventory_mode: "approximate_shots",
      remaining_g: 18,
      estimated_dose_g: 18,
    });
    expect(result).toContain("1 shot ");
    expect(result).not.toContain("1 shots");
  });
});
