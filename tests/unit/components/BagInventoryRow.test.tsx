import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BagInventoryRow } from "@/components/inventory/BagInventoryRow";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { InventoryBagRow } from "@/features/inventory/queries";
import es from "@/lib/i18n/dictionaries/es";

const archiveCoffeeAction = vi.fn(async () => ({ success: true as const, data: undefined }));
const unarchiveCoffeeAction = vi.fn(async () => ({ success: true as const, data: undefined }));
const deleteCoffeeAction = vi.fn(async () => ({ success: true as const, data: undefined }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/coffees/actions", () => ({
  archiveCoffeeAction: (...args: unknown[]) => archiveCoffeeAction(...(args as [])),
  unarchiveCoffeeAction: (...args: unknown[]) => unarchiveCoffeeAction(...(args as [])),
  deleteCoffeeAction: (...args: unknown[]) => deleteCoffeeAction(...(args as [])),
  getCoffeeDeletionImpactAction: async () => ({
    success: true as const,
    data: { bags: 2, attempts: 14 },
  }),
}));

function makeBag(overrides: Partial<InventoryBagRow> = {}): InventoryBagRow {
  return {
    id: "bag-1",
    coffee_id: "coffee-1",
    status: "open",
    inventory_mode: "none",
    remaining_g: null,
    estimated_dose_g: null,
    coffee: { id: "coffee-1", name: "La Esperanza", roaster: "Tostador X", archived_at: null },
    ...overrides,
  } as InventoryBagRow;
}

function renderRow(bag: InventoryBagRow) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <BagInventoryRow bag={bag} dict={es} />
    </LocaleProvider>,
  );
}

// The hook opens the same menu for a right-click as for a completed hold,
// which is the path a test can take without waiting out the 500 ms timer.
function openMenu() {
  fireEvent.contextMenu(screen.getByRole("link", { name: /La Esperanza/ }));
}

describe("BagInventoryRow", () => {
  beforeEach(() => {
    archiveCoffeeAction.mockClear();
    unarchiveCoffeeAction.mockClear();
    deleteCoffeeAction.mockClear();
  });

  it("offers prepare, archive and delete on a long press", () => {
    renderRow(makeBag());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    openMenu();

    const menu = screen.getByRole("menu", { name: es.coffees.coffeeMenuLabel });
    expect(menu).toBeInTheDocument();
    expect(screen.getByText(es.dashboard.prepare)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.coffees.archive })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.common.delete })).toBeInTheDocument();
  });

  it("offers 'Desarchivar' instead once the coffee is archived", async () => {
    const user = userEvent.setup();
    renderRow(makeBag({ coffee: { id: "coffee-1", name: "La Esperanza", roaster: "Tostador X", archived_at: "2026-01-01T00:00:00Z" } }));

    openMenu();
    expect(screen.queryByRole("button", { name: es.coffees.archive })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: es.coffees.unarchive }));

    // Confirming calls unarchive, not archive — the archive is only reachable
    // from Inventario, so getting it wrong would strand the coffee there.
    await user.click(screen.getByRole("button", { name: es.common.yes }));
    expect(unarchiveCoffeeAction).toHaveBeenCalledWith("coffee-1");
    expect(archiveCoffeeAction).not.toHaveBeenCalled();
  });

  it("treats a bag archived on its own as archived too", () => {
    renderRow(makeBag({ status: "archived" }));
    openMenu();
    expect(screen.getByRole("button", { name: es.coffees.unarchive })).toBeInTheDocument();
  });

  it("holds the delete until the coffee's name is typed, and says what it takes", async () => {
    const user = userEvent.setup();
    renderRow(makeBag());

    openMenu();
    await user.click(screen.getByRole("button", { name: es.common.delete }));

    expect(
      await screen.findByText(/2 bolsas y 14 intentos/),
    ).toBeInTheDocument();

    const confirmButton = screen.getByRole("button", { name: es.coffees.deleteConfirmButton });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByRole("textbox"), "La Esperanza");
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(deleteCoffeeAction).toHaveBeenCalledWith("coffee-1");
  });
});
