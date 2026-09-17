import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttemptRow } from "@/components/dashboard/AttemptRow";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { RecentAttempt } from "@/features/dashboard/queries";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/brew/actions", () => ({
  startBrewFromAttemptAction: vi.fn(),
}));

vi.mock("@/features/attempts/actions", () => ({
  deleteAttemptAction: vi.fn(),
  setAttemptDashboardVisibilityAction: vi.fn(),
}));

function makeAttempt(overrides: Partial<RecentAttempt> = {}): RecentAttempt {
  return {
    id: "attempt-1",
    attempt_no: 1,
    method: "espresso",
    created_at: new Date().toISOString(),
    dose_g: 18,
    water_g: null,
    target_weight_g: 36,
    output_weight_g: 36,
    extraction_ms: 27000,
    overall_rating: 4,
    hidden_from_dashboard: false,
    coffee: { id: "coffee-1", name: "La Esperanza", roaster: "Tostador X" },
    ...overrides,
  };
}

function renderRow(attempt: RecentAttempt = makeAttempt()) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <AttemptRow attempt={attempt} />
    </LocaleProvider>,
  );
}

describe("AttemptRow actions menu", () => {
  it("offers a control anyone can see and reach, not only a long press", async () => {
    // Preparar / archivar / eliminar were behind a held finger and nothing
    // else: unmarked on screen, and impossible from a keyboard.
    renderRow();

    const trigger = screen.getByRole("button", { name: es.dashboard.attemptMenuLabel });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    expect(screen.getByRole("menu", { name: es.dashboard.attemptMenuLabel })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: es.dashboard.prepare })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the row itself a plain link to the attempt", () => {
    // The menu button is a sibling of the link, not inside it: a button
    // nested in an anchor is invalid, and the whole row must still be one
    // tap away from the attempt it names.
    renderRow();

    const link = screen.getByRole("link", { name: /La Esperanza/ });
    expect(link).toHaveAttribute("href", "/attempts/attempt-1");
    expect(
      link.querySelector(`[aria-label="${es.dashboard.attemptMenuLabel}"]`),
    ).toBeNull();
  });

  it("closes on Escape", async () => {
    renderRow();

    await userEvent.click(screen.getByRole("button", { name: es.dashboard.attemptMenuLabel }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
