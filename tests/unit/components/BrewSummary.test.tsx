import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrewSummary, type BrewSummaryAttempt } from "@/components/attempt/BrewSummary";
import es from "@/lib/i18n/dictionaries/es";

function make(overrides: Partial<BrewSummaryAttempt> = {}): BrewSummaryAttempt {
  return {
    method: "espresso",
    cup_count: 2,
    dose_g: 18,
    water_g: null,
    dilution_water_g: null,
    target_weight_g: 36,
    output_weight_g: 36,
    extraction_ms: 27000,
    ...overrides,
  };
}

// The visible line, group by group. textContent alone would run them
// together — the spacing between groups is CSS, not characters.
function groups(attempt: BrewSummaryAttempt) {
  const { container } = render(<BrewSummary attempt={attempt} dict={es} />);
  container.querySelectorAll(".sr-only").forEach((n) => n.remove());
  return [...(container.firstElementChild?.children ?? [])].map((n) =>
    (n.textContent ?? "").replace(/\s+/g, " ").trim(),
  );
}

describe("BrewSummary", () => {
  it("reads the clock, then dose against ratio, then cups", () => {
    expect(groups(make())).toEqual(["27 s", "18 g1:2", "2"]);
  });

  it("measures an espresso against the cup and a pour-over against the water", () => {
    // 18 in, 36 out is 1:2; the same dose with 300 g of water through a V60
    // is 1:16.7 — the denominator is the method's, not a constant.
    expect(groups(make())[1]).toContain("1:2");
    expect(
      groups(make({ method: "v60", cup_count: null, water_g: 300, target_weight_g: null, output_weight_g: null }))[1],
    ).toContain("1:16.7");
  });

  it("counts the water added after the brew, on the method that adds some", () => {
    // Aeropress dilution is still water, so the final ratio has to include
    // it — 15 g against 100 + 50 is 1:10, not 1:6.7.
    expect(
      groups(
        make({
          method: "aeropress",
          cup_count: null,
          dose_g: 15,
          water_g: 100,
          dilution_water_g: 50,
          target_weight_g: null,
          output_weight_g: null,
        }),
      )[1],
    ).toContain("1:10");
  });

  it("empties the cell rather than printing a dash, and keeps the others put", () => {
    // Every attempt logged before cup_count existed has none, and most
    // methods never ask. The cell still renders so the two that remain
    // don't slide out to the edges of the box.
    expect(groups(make({ cup_count: null }))).toEqual(["27 s", "18 g1:2", ""]);
    expect(groups(make({ extraction_ms: null }))).toEqual(["", "18 g1:2", "2"]);
    expect(groups(make({ dose_g: null }))).toEqual(["27 s", "", "2"]);
  });

  it("says so when there is nothing to show", () => {
    render(
      <BrewSummary
        attempt={make({ cup_count: null, dose_g: null, extraction_ms: null })}
        dict={es}
      />,
    );
    expect(screen.getByText(es.dashboard.noRecipeData)).toBeInTheDocument();
  });

  it("names each number for a screen reader, which gets none of the icons", () => {
    render(<BrewSummary attempt={make()} dict={es} />);
    for (const label of [es.brew.cupCount, es.dashboard.dose, es.brew.ratio, es.dashboard.extraction]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
