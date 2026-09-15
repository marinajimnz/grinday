import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoffeeFilters } from "@/components/coffee/CoffeeFilters";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/coffees",
  useSearchParams: () => new URLSearchParams(),
}));

describe("CoffeeFilters", () => {
  it("offers every bag status except 'Archivada'", () => {
    render(
      <LocaleProvider locale="es" dict={es}>
        <CoffeeFilters />
      </LocaleProvider>,
    );

    const select = screen.getByLabelText(es.coffees.filterBagStatus);
    const options = [...select.querySelectorAll("option")].map((o) => o.value);

    // Archiving stamps coffees.archived_at and listCoffees hides those
    // coffees, so this option could only ever match a hand-edited bag — it
    // came back empty every time and read as a broken filter.
    expect(options).not.toContain("archived");
    expect(options).toEqual(["", "sealed", "open", "finished"]);
  });
});
