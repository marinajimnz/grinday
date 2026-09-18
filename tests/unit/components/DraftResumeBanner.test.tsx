import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftResumeBanner } from "@/components/dashboard/DraftResumeBanner";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { saveDraft, type BrewDraft } from "@/features/brew/draft";
import es from "@/lib/i18n/dictionaries/es";

const discardDraft = vi.fn(async () => {});

vi.mock("@/features/brew/discardDraft", () => ({
  discardDraft: (...args: unknown[]) => discardDraft(...(args as [])),
}));

const USER_ID = "user-1";

// Only a draft whose timer already stopped is resumable, and resumeCount >= 1
// is what flips the banner from a silent "Continuar" to the keep-or-drop
// decision — see getMostRecentDraft and DraftResumeBanner.
function seedDraft(overrides: Partial<BrewDraft> = {}) {
  saveDraft({
    draftId: "draft-1",
    userId: USER_ID,
    coffeeId: "coffee-1",
    coffeeBagId: "bag-1",
    coffeeName: "La Esperanza",
    roaster: "Tostador X",
    recipe: {},
    startedAtEpochMs: 1,
    stoppedAtEpochMs: 2,
    extractionMs: 1,
    postShot: {},
    createdAt: 1,
    resumeCount: 1,
    ...overrides,
  } as BrewDraft);
}

function renderBanner() {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <DraftResumeBanner currentUserId={USER_ID} />
    </LocaleProvider>,
  );
}

describe("DraftResumeBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    discardDraft.mockClear();
  });

  it("offers to resume the brew, not just to drop it or postpone it", () => {
    seedDraft();
    renderBanner();

    expect(screen.getByText(es.dashboard.draftAbandonedTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(es.dashboard.resumeDraft) })).toHaveAttribute(
      "href",
      "/brew/live/draft-1",
    );
    expect(
      screen.getByRole("button", { name: es.dashboard.draftAbandonedContinueLater }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: es.dashboard.draftAbandonedDiscard }),
    ).toBeInTheDocument();
  });

  it("does not discard until the confirmation is accepted", async () => {
    const user = userEvent.setup();
    seedDraft();
    renderBanner();

    await user.click(screen.getByRole("button", { name: es.dashboard.draftAbandonedDiscard }));
    expect(discardDraft).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(es.dashboard.draftDiscardConfirm);

    await user.click(screen.getByRole("button", { name: es.common.cancel }));
    expect(discardDraft).not.toHaveBeenCalled();
    expect(screen.getByText(es.dashboard.draftAbandonedTitle)).toBeInTheDocument();
  });

  it("discards the draft once confirmed", async () => {
    const user = userEvent.setup();
    seedDraft();
    renderBanner();

    await user.click(screen.getByRole("button", { name: es.dashboard.draftAbandonedDiscard }));
    // The confirm button names the action rather than answering "Sí", so it's
    // the label that has to be clicked here.
    await user.click(
      screen.getAllByRole("button", { name: es.dashboard.draftAbandonedDiscard }).at(-1)!,
    );

    expect(discardDraft).toHaveBeenCalledWith("draft-1");
    expect(screen.queryByText(es.dashboard.draftAbandonedTitle)).not.toBeInTheDocument();
  });

  it("still resumes silently while the draft has only been left once", () => {
    seedDraft({ resumeCount: 0 });
    renderBanner();

    expect(screen.queryByText(es.dashboard.draftAbandonedTitle)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(es.dashboard.resumeDraft) })).toHaveAttribute(
      "href",
      "/brew/live/draft-1",
    );
  });
});
