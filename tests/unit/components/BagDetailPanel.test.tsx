import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BagDetailPanel } from "@/components/coffee/BagDetailPanel";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { CoffeeBagRow } from "@/features/coffees/queries";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/coffees/actions", () => ({
  deleteBagAction: vi.fn(),
  getBagDeletionImpactAction: vi.fn(),
  setBagFinishedAction: vi.fn(),
}));

vi.mock("@/components/inventory/InventoryAdjustPanel", () => ({
  InventoryAdjustPanel: () => null,
}));

function makeBag(overrides: Partial<CoffeeBagRow> = {}): CoffeeBagRow {
  return {
    id: "bag-1",
    coffee_id: "coffee-1",
    user_id: "user-1",
    status: "open",
    inventory_mode: "none",
    remaining_g: null,
    estimated_dose_g: null,
    package_weight_g: 250,
    roast_date: null,
    purchase_date: null,
    opened_at: "2026-09-01",
    first_brew_at: null,
    finished_at: null,
    ...overrides,
  } as CoffeeBagRow;
}

function renderPanel(bag: CoffeeBagRow) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <BagDetailPanel bag={bag} />
    </LocaleProvider>,
  );
}

describe("BagDetailPanel inventory", () => {
  it("says 'Sin seguimiento' once, as the mode, not again as the amount", () => {
    renderPanel(makeBag({ inventory_mode: "none" }));

    // The panel used to print it twice: once naming the mode, and once more
    // as the figure underneath, because formatRemaining falls back to the
    // same words when there is nothing to count.
    expect(screen.getAllByText(/Sin seguimiento/)).toHaveLength(1);
  });

  it("does not claim a tracked bag is untracked when no weight has been recorded", () => {
    renderPanel(makeBag({ inventory_mode: "manual_grams", remaining_g: null }));

    expect(screen.getByText(/Gramos \(báscula\)/)).toBeDefined();
    expect(screen.queryByText(/Sin seguimiento/)).toBeNull();
  });

  it("still shows what is left when there is something to show", () => {
    renderPanel(makeBag({ inventory_mode: "manual_grams", remaining_g: 180 }));

    expect(screen.getByText("180 g")).toBeDefined();
  });
});
