import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrewLiveScreen } from "@/components/brew/BrewLiveScreen";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { loadDraft, saveDraft, type BrewDraft } from "@/features/brew/draft";
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

  it("offers 'guardar sin cronometrar' while the shot hasn't started", async () => {
    saveFinishedBrew({ startedAtEpochMs: null, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    // Nothing has run, so the screen opens on the recipe step — step into the
    // timer the way a person does.
    await userEvent.click(await screen.findByRole("button", { name: es.common.next }));

    expect(await screen.findByRole("heading", { name: es.brew.stepTimerTitle })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.brew.saveWithoutTimer })).toBeInTheDocument();
  });

  it("hides it once the timer is running, so a mis-tap can't discard the timing", async () => {
    // Started and not yet stopped: the shot is pulling right now. The button
    // is full-width and sits directly under "Parar", and it saves with
    // extractionMs null — no confirm, no undo.
    saveFinishedBrew({ startedAtEpochMs: Date.now() - 5000, stoppedAtEpochMs: null, extractionMs: null });
    renderScreen();

    expect(await screen.findByRole("heading", { name: es.brew.stepTimerTitle })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: es.brew.stop })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: es.brew.saveWithoutTimer })).not.toBeInTheDocument();
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
