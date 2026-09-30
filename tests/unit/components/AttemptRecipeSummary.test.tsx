import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AttemptRecipeSummary } from "@/components/attempt/AttemptRecipeSummary";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import es from "@/lib/i18n/dictionaries/es";

function makeAttempt(overrides: Partial<BrewAttemptRow> = {}): BrewAttemptRow {
  return { id: "a1", attempt_no: 1, method: "espresso", ...overrides } as BrewAttemptRow;
}

function renderCard(attempt: BrewAttemptRow) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <AttemptRecipeSummary attempt={attempt} />
    </LocaleProvider>,
  );
}

describe("AttemptRecipeSummary", () => {
  it("keeps the label before its value in the DOM, whatever the eye sees", () => {
    // The card shows the number first and its name underneath, but that is
    // done with `order` — the markup stays dt-then-dd, which is what a <dl>
    // requires and what makes a screen reader say "Temperatura, 94 °C"
    // rather than reading a number with no name attached. Swapping the two
    // in the markup to get the same look would break that silently.
    const { container } = renderCard(makeAttempt({ temperature_c: 94 }));

    const cell = container.querySelector("dl > div")!;
    const tags = [...cell.children].map((el) => el.tagName);
    expect(tags.indexOf("DT")).toBeLessThan(tags.indexOf("DD"));
    expect(within(cell as HTMLElement).getByText("94 °C").tagName).toBe("DD");
    expect(within(cell as HTMLElement).getByText(es.brew.temperatureC).closest("dt")).not.toBeNull();
  });

  it("draws an icon beside each name it has one for", () => {
    const { container } = renderCard(
      makeAttempt({ dose_g: 20, temperature_c: 94, grinder_upper_burr: 5 }),
    );

    const cells = [...container.querySelectorAll("dl > div")];
    expect(cells).toHaveLength(3);
    for (const cell of cells) {
      expect(cell.querySelector("dt svg")).not.toBeNull();
    }
  });

  it("draws the two burr icons larger than the rest", () => {
    // They are the same toothed ring with a small arrow above or below it.
    // At the 16px every other icon uses, that arrow is barely a mark and the
    // pair reads as one icon drawn twice, so the card looks like it is
    // showing the same thing under two different numbers.
    const { container } = renderCard(
      makeAttempt({ temperature_c: 94, grinder_upper_burr: 5, grinder_lower_burr: 2 }),
    );

    const sizeOf = (label: string) =>
      [...container.querySelectorAll("dl > div")]
        .find((c) => c.textContent?.includes(label))!
        .querySelector("dt svg")!.classList;

    expect(sizeOf(es.brew.grinderUpperBurr)).toContain("size-5");
    expect(sizeOf(es.brew.grinderLowerBurr)).toContain("size-5");
    expect(sizeOf(es.brew.temperatureC)).toContain("size-4");
  });

  it("puts the cup count on the method line, not in the grid", () => {
    const { container } = renderCard(makeAttempt({ dose_g: 20, cup_count: 2 }));

    // The method line is the card's first child; the grid is the <dl>.
    const header = container.querySelector("div > div")!;
    expect(within(header as HTMLElement).getByText("2")).toBeInTheDocument();
    expect(within(header as HTMLElement).getByText(es.brew.cupCount)).toHaveClass("sr-only");
    expect(container.querySelector("dl")!.textContent).not.toContain(es.brew.cupCount);
  });

  it("badges the cups on a pour-over too, but never on a moka pot", () => {
    // Every method records cups now. The moka pot is the exception: its
    // "Tamaño moka" cell is already that number, so a badge would say the
    // same thing twice on the same card.
    const pourOver = renderCard(makeAttempt({ method: "v60", water_g: 300, cup_count: 2 }));
    expect(pourOver.container.querySelector("div > div")!.textContent).toContain("2");
    pourOver.unmount();

    const moka = renderCard(makeAttempt({ method: "moka", moka_cup_size: 3, cup_count: 3 }));
    expect(moka.container.querySelector("div > div")!.textContent).not.toContain(es.brew.cupCount);
  });

  it("leaves a metric the icon set has nothing for with its name alone", () => {
    // There is no flame in the set. Borrowing an icon that means something
    // else would be worse than none.
    const { container } = renderCard(
      makeAttempt({ method: "moka", heat_intensity: "medium" }),
    );

    const cell = [...container.querySelectorAll("dl > div")].find((c) =>
      c.textContent?.includes(es.brew.heatIntensity),
    )!;
    expect(cell.querySelector("dt svg")).toBeNull();
    expect(screen.getByText(es.enums.heatIntensity.medium)).toBeInTheDocument();
  });

  it("shows the espresso basket type", () => {
    renderCard(makeAttempt({ dose_g: 18, basket_type: "non_pressurized" }));
    expect(screen.getByText(es.brew.basketType)).toBeInTheDocument();
    expect(screen.getByText(es.enums.basketType.non_pressurized)).toBeInTheDocument();
  });

  it("says nothing about the basket on a method that doesn't have one", () => {
    renderCard(makeAttempt({ method: "v60", dose_g: 15, basket_type: "pressurized" }));
    expect(screen.queryByText(es.brew.basketType)).toBeNull();
  });
});
