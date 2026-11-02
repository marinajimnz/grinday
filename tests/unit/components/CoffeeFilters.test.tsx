import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoffeeFilters } from "@/components/coffee/CoffeeFilters";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import es from "@/lib/i18n/dictionaries/es";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/coffees",
  useSearchParams: () => new URLSearchParams("bagStatus=open"),
}));

function renderFilters() {
  render(
    <LocaleProvider locale="es" dict={es}>
      <CoffeeFilters />
    </LocaleProvider>,
  );
}

describe("CoffeeFilters", () => {
  it("offers Todos, Abiertas and Sin abrir — never 'Archivada'", () => {
    renderFilters();

    const group = screen.getByRole("group", { name: es.coffees.filterBagStatus });
    const labels = [...group.querySelectorAll("button")].map((b) => b.textContent);

    // Archiving stamps coffees.archived_at and listCoffees hides those
    // coffees, so an "Archivada" option could only ever match a hand-edited
    // bag — it came back empty every time and read as a broken filter.
    expect(labels).toEqual(["Todos", "Abiertas", "Sin abrir"]);
  });

  it("marks the status in the URL as pressed and switches it on tap", async () => {
    renderFilters();

    expect(screen.getByRole("button", { name: "Abiertas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(screen.getByRole("button", { name: "Sin abrir" }));
    expect(replace).toHaveBeenCalledWith("/coffees?bagStatus=sealed");

    await userEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(replace).toHaveBeenLastCalledWith("/coffees?");
  });
});
