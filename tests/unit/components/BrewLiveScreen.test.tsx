import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrewLiveScreen } from "@/components/brew/BrewLiveScreen";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { loadDraft, saveDraft, type BrewDraft } from "@/features/brew/draft";
import { createAttemptAction } from "@/features/attempts/actions";
import es from "@/lib/i18n/dictionaries/es";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/attempts/actions", () => ({
  createAttemptAction: vi.fn(),
}));

// Only reached by the photo step's uploader, which this test never triggers
// — stubbed so importing the screen doesn't need real Supabase env vars.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: async () => ({ data: [], error: null }),
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
      }),
    },
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
  }),
}));

const DRAFT_ID = "11111111-1111-1111-1111-111111111111";

function saveFinishedBrew(overrides: Partial<BrewDraft> = {}) {
  const draft: BrewDraft = {
    draftId: DRAFT_ID,
    userId: "user-1",
    coffeeId: "coffee-1",
    coffeeBagId: "bag-1",
    coffeeName: "La Esperanza",
    roaster: "Tostador X",
    recipe: { method: "espresso", doseG: 18, targetWeightG: 36 },
    startedAtEpochMs: Date.now() - 30000,
    stoppedAtEpochMs: Date.now(),
    extractionMs: 27000,
    photos: [],
    photoStepDone: false,
    postShot: {},
    createdAt: Date.now(),
    ...overrides,
  };
  saveDraft(draft);
}

function renderScreen() {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <BrewLiveScreen draftId={DRAFT_ID} />
    </LocaleProvider>,
  );
}

describe("BrewLiveScreen step order", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the photo step — not the rating — as soon as the timer stops", async () => {
    saveFinishedBrew();
    renderScreen();

    expect(await screen.findByRole("heading", { name: es.brew.stepPhotoTitle })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: es.brew.stepResultTitle })).not.toBeInTheDocument();
    // The coffee is photographed before it's tasted, so nothing is rated yet.
    expect(screen.queryByRole("radiogroup", { name: es.brew.overallRating })).not.toBeInTheDocument();
  });

  it("opens the rating only after the photo step is passed", async () => {
    saveFinishedBrew();
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: es.brew.continueWithoutPhoto }));

    expect(await screen.findByRole("heading", { name: es.brew.stepResultTitle })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: es.brew.overallRating })).toBeInTheDocument();
    // Persisted, so a reload from the rating doesn't bounce back to the photo.
    expect(loadDraft(DRAFT_ID)?.photoStepDone).toBe(true);
  });

  it("lets the rating step go back to the photo", async () => {
    saveFinishedBrew({ photoStepDone: true });
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: es.brew.backToPhoto }));

    expect(await screen.findByRole("heading", { name: es.brew.stepPhotoTitle })).toBeInTheDocument();
    expect(loadDraft(DRAFT_ID)?.photoStepDone).toBe(false);
  });
});

describe("BrewLiveScreen timer step", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("offers 'continuar sin cronometrar' while the shot hasn't started", async () => {
    saveFinishedBrew({ startedAtEpochMs: null, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    // Nothing has run, so the screen opens on the recipe step — step into the
    // timer the way a person does.
    await userEvent.click(await screen.findByRole("button", { name: es.common.next }));

    expect(await screen.findByRole("heading", { name: es.brew.stepTimerTitle })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.brew.skipTimer })).toBeInTheDocument();
  });

  it("carries an untimed brew on to the photo and rating steps instead of saving it", async () => {
    // The whole point of the journal is what the coffee tasted like, and
    // this button used to skip straight past that question: it saved the
    // attempt from the timer step and dropped you on the attempt page,
    // rated nothing, with no way back into the flow. Not timing a brew is
    // a choice about the clock, not about tasting it.
    saveFinishedBrew({ startedAtEpochMs: null, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: es.common.next }));
    await userEvent.click(screen.getByRole("button", { name: es.brew.skipTimer }));

    // The brew is over, and with no target to fall back on it has no
    // reading — which is the truth of it.
    const draft = loadDraft(DRAFT_ID);
    expect(draft?.stoppedAtEpochMs).not.toBeNull();
    expect(draft?.extractionMs).toBeNull();
    expect(createAttemptAction).not.toHaveBeenCalled();

    // And the flow continues exactly as a stopped timer would: photo first.
    expect(await screen.findByRole("heading", { name: es.brew.stepPhotoTitle })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: es.brew.continueWithoutPhoto }));
    expect(await screen.findByRole("heading", { name: es.brew.stepResultTitle })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: es.brew.overallRating })).toBeInTheDocument();
  });

  it("fills in the recipe's target time when the brew goes untimed", async () => {
    // A recipe that says 27s and a result step that says nothing reads as
    // if the recipe had no time at all. Without a reading, the target is
    // the best account of how long it ran.
    saveFinishedBrew({
      recipe: { method: "espresso", doseG: 18, targetWeightG: 36, targetTimeMs: 27000 },
      startedAtEpochMs: null,
      stoppedAtEpochMs: null,
      extractionMs: null,
    });
    renderScreen();
    await userEvent.click(await screen.findByRole("button", { name: es.common.next }));
    await userEvent.click(screen.getByRole("button", { name: es.brew.skipTimer }));

    expect(loadDraft(DRAFT_ID)?.extractionMs).toBe(27000);
  });

  it("hides it once the timer is running, so a mis-tap can't discard the timing", async () => {
    // Started and not yet stopped: the shot is pulling right now. The button
    // is full-width, sits directly under "Parar", and ends the brew with no
    // reading — no confirm, no undo.
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    expect(await screen.findByRole("heading", { name: es.brew.stepTimerTitle })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.brew.stop })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.brew.skipTimer })).not.toBeInTheDocument();
  });
});

describe("BrewLiveScreen legacy drafts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sends a draft from before the photo step straight to the rating", async () => {
    // No `photos` key at all: written by a version that had no photo step,
    // so its coffee is long gone and there's nothing left to photograph.
    const legacy = {
      draftId: DRAFT_ID,
      userId: "user-1",
      coffeeId: "coffee-1",
      coffeeBagId: "bag-1",
      coffeeName: "La Esperanza",
      roaster: "Tostador X",
      recipe: { method: "espresso" },
      startedAtEpochMs: Date.now() - 30000,
      stoppedAtEpochMs: Date.now(),
      extractionMs: 27000,
      postShot: {},
      createdAt: Date.now(),
    };
    localStorage.setItem(`grinday:brew-draft:${DRAFT_ID}`, JSON.stringify(legacy));

    renderScreen();

    expect(await screen.findByRole("heading", { name: es.brew.stepResultTitle })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: es.brew.stepPhotoTitle })).not.toBeInTheDocument();
  });
});

describe("BrewLiveScreen timer pause and reset", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("banks the time it had when paused, instead of losing it", async () => {
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: es.brew.pause }));

    const draft = loadDraft(DRAFT_ID);
    expect(draft?.startedAtEpochMs).toBeNull();
    expect(draft?.accumulatedMs).toBeGreaterThanOrEqual(4900);
    // Still on the timer step — pausing isn't finishing.
    expect(draft?.stoppedAtEpochMs).toBeNull();
  });

  it("keeps 'continuar sin cronometrar' away while paused", async () => {
    // The button ends the brew with no reading, and asks nothing first. A
    // paused clock is holding a reading, so it is exactly what would be
    // thrown away — the same trap as while it's running.
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: es.brew.pause }));

    expect(screen.getByRole("button", { name: es.brew.resume })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.brew.skipTimer })).not.toBeInTheDocument();
  });

  it("can still be stopped from paused, without resuming first", async () => {
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: es.brew.pause }));
    await userEvent.click(screen.getByRole("button", { name: es.brew.stop }));

    const draft = loadDraft(DRAFT_ID);
    expect(draft?.stoppedAtEpochMs).not.toBeNull();
    expect(draft?.extractionMs).toBeGreaterThanOrEqual(4900);
  });

  it("puts the escape hatch back once a reset leaves nothing to lose", async () => {
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    await userEvent.click(await screen.findByRole("button", { name: es.brew.pause }));
    await userEvent.click(screen.getByRole("button", { name: es.brew.reset }));

    expect(loadDraft(DRAFT_ID)?.accumulatedMs).toBe(0);
    expect(screen.getByRole("button", { name: es.brew.skipTimer })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.brew.reset })).not.toBeInTheDocument();
  });

  it("offers no reset while the clock is moving", async () => {
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    expect(await screen.findByRole("button", { name: es.brew.stop })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.brew.reset })).not.toBeInTheDocument();
  });
});
