import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttemptDetailPanel } from "@/components/attempt/AttemptDetailPanel";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/attempts/actions", () => ({
  deleteAttemptAction: vi.fn(),
  setAttemptFavouriteAction: vi.fn(),
}));

vi.mock("@/features/brew/actions", () => ({
  startBrewFromAttemptAction: vi.fn(),
}));

// Every nullable column defaults to null, so each test states only the
// fields it's actually about.
function makeAttempt(overrides: Partial<BrewAttemptRow> = {}): BrewAttemptRow {
  return {
    id: "attempt-1",
    attempt_no: 1,
    user_id: "user-1",
    coffee_id: "coffee-1",
    coffee_bag_id: "bag-1",
    method: "espresso",
    created_at: "2026-01-02T10:00:00.000Z",
    updated_at: "2026-01-02T10:00:00.000Z",
    equipment_snapshot: {},
    machine_snapshot: {},
    hidden_from_dashboard: false,
    acidity: null,
    balance: null,
    basket_size: null,
    bitterness: null,
    body: null,
    dilution_water_g: null,
    dose_feedback: null,
    dose_g: null,
    dose_mode: null,
    equipment_id: null,
    extraction_ms: null,
    grind_seconds: null,
    grind_setting: null,
    grinder_id: null,
    grinder_lower_burr: null,
    grinder_upper_burr: null,
    heat_intensity: null,
    basket_type: null,
    idempotency_key: null,
    input_weight_g: null,
    intensity: null,
    machine_id: null,
    moka_cup_size: null,
    notes: null,
    output_weight_g: null,
    overall_rating: null,
    parent_attempt_id: null,
    shot_mode: null,
    sweetness: null,
    target_time_ms: null,
    target_weight_g: null,
    tds_percent: null,
    temperature_c: null,
    temperature_offset_c: null,
    water_g: null,
    would_brew_again: null,
    ...overrides,
  } as BrewAttemptRow;
}

function renderPanel(attempt: BrewAttemptRow) {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <AttemptDetailPanel attempt={attempt} coffeeId="coffee-1" isFavourite={false} />
    </LocaleProvider>,
  );
}

describe("AttemptDetailPanel recipe", () => {
  it("leads with the recipe a guided brew actually recorded", () => {
    // These are the columns the guided flow writes. The page used to render
    // the manual form's columns instead, so an attempt like this one showed
    // no recipe at all.
    renderPanel(
      makeAttempt({
        dose_g: 18,
        target_weight_g: 36,
        output_weight_g: 36,
        temperature_c: 93,
        extraction_ms: 27400,
      }),
    );

    expect(screen.getByText("1:2")).toBeInTheDocument();
    expect(screen.getByText(es.brew.doseG)).toBeInTheDocument();
    expect(screen.getByText("18 g")).toBeInTheDocument();
    expect(screen.getByText("27.4 s")).toBeInTheDocument();
    expect(screen.getByText("93 °C")).toBeInTheDocument();
  });

  it("reads a manual attempt's input/output weights as the same two numbers", () => {
    // The manual form never wrote dose_g or target_weight_g — it wrote the
    // Sage-era pair. Same shot, so the recipe has to come out the same.
    renderPanel(makeAttempt({ input_weight_g: 18, output_weight_g: 36, grind_setting: 12 }));

    expect(screen.getByText("1:2")).toBeInTheDocument();
    expect(screen.getByText("18 g")).toBeInTheDocument();
    expect(screen.getByText(es.brew.grindSetting)).toBeInTheDocument();
  });

  it("shows only the fields the method brews with", () => {
    // Espresso pours no water, so a water figure would be meaningless even
    // if some earlier edit had left one on the row.
    renderPanel(makeAttempt({ dose_g: 18, output_weight_g: 36, water_g: 500 }));
    expect(screen.queryByText(es.brew.waterG)).not.toBeInTheDocument();

    // A V60 is the other way round: water is the recipe, and the ratio is
    // measured against it rather than against what landed in the cup.
    renderPanel(makeAttempt({ method: "v60", dose_g: 15, water_g: 250, output_weight_g: 230 }));
    expect(screen.getByText(es.brew.waterG)).toBeInTheDocument();
    expect(screen.getByText("1:16.7")).toBeInTheDocument();
  });

  it("names the time the way the method does", () => {
    renderPanel(makeAttempt({ method: "prensa", dose_g: 15, water_g: 250, extraction_ms: 240000 }));
    expect(screen.getByText(es.brew.steepTime)).toBeInTheDocument();
    expect(screen.queryByText(es.brew.extractionTime)).not.toBeInTheDocument();
  });
});

describe("AttemptDetailPanel machine settings", () => {
  it("keeps the legacy machine columns behind a disclosure instead of in front of the recipe", () => {
    renderPanel(
      makeAttempt({ dose_g: 18, output_weight_g: 36, temperature_offset_c: 1 }),
    );

    expect(screen.queryByText(es.attempts.temperatureOffsetShort)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.attempts.machineSettings })).toBeInTheDocument();
  });

  it("opens them on demand", async () => {
    renderPanel(makeAttempt({ dose_g: 18, output_weight_g: 36, temperature_offset_c: 1 }));

    await userEvent.click(screen.getByRole("button", { name: es.attempts.machineSettings }));

    expect(screen.getByText(es.attempts.temperatureOffsetShort)).toBeInTheDocument();
    expect(screen.getByText("1 °C")).toBeInTheDocument();
  });

  it("offers no disclosure at all when there's nothing legacy on the row", () => {
    renderPanel(makeAttempt({ dose_g: 18, output_weight_g: 36 }));
    expect(
      screen.queryByRole("button", { name: es.attempts.machineSettings }),
    ).not.toBeInTheDocument();
  });
});

describe("AttemptDetailPanel delete", () => {
  it("asks before deleting, naming the act rather than answering Sí/No", async () => {
    renderPanel(makeAttempt({ dose_g: 18, output_weight_g: 36 }));

    await userEvent.click(screen.getByRole("button", { name: es.common.delete }));

    expect(screen.getByText(es.dashboard.deleteAttemptConfirm)).toBeInTheDocument();
    // Two now: the trigger and the dialog's own confirm.
    expect(screen.getAllByRole("button", { name: es.common.delete })).toHaveLength(2);
  });

  it("does not carry the page's heaviest fill — that belongs to what you came to do", () => {
    renderPanel(makeAttempt({ dose_g: 18, output_weight_g: 36 }));

    // "destructive" is the filled coral variant; the trigger is a bordered
    // secondary, so deleting no longer outweighs "Duplicar y ajustar".
    const trigger = screen.getByRole("button", { name: es.common.delete });
    expect(trigger.className).not.toContain("bg-[#F47174]");
    expect(trigger.className).toContain("border");
  });
});

describe("AttemptDetailPanel grind", () => {
  it("keeps the burr settings in the recipe — on a two-stage grinder they are the grind", () => {
    // A guided brew writes neither grind_setting nor grind_seconds, so
    // burying these two would leave the recipe with no record of how the
    // coffee was ground at all.
    renderPanel(
      makeAttempt({ dose_g: 18, output_weight_g: 36, grinder_upper_burr: 4, grinder_lower_burr: 14 }),
    );

    expect(screen.getByText(es.brew.grinderUpperBurr)).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    // And they're not what opens the machine disclosure.
    expect(
      screen.queryByRole("button", { name: es.attempts.machineSettings }),
    ).not.toBeInTheDocument();
  });
});

describe("AttemptDetailPanel roast age", () => {
  it("says how old the coffee was on the day it was brewed", () => {
    render(
      <LocaleProvider locale="es" dict={es}>
        <AttemptDetailPanel
          attempt={makeAttempt({ created_at: "2026-01-14T09:00:00.000Z" })}
          coffeeId="coffee-1"
          isFavourite={false}
          roastDate="2026-01-02"
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("12 días tras el tueste")).toBeInTheDocument();
  });

  it("says nothing when the bag has no roast date", () => {
    renderPanel(makeAttempt());
    expect(screen.queryByText(/tras el tueste/)).not.toBeInTheDocument();
  });
});
