import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TryRecipeButton } from "@/components/profile/TryRecipeButton";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { loadDraft } from "@/features/brew/draft";
import es from "@/lib/i18n/dictionaries/es";

const tryPublicRecipeAction = vi.fn();
const push = vi.fn();

vi.mock("@/features/profile/tryRecipe", () => ({
  tryPublicRecipeAction: (...args: unknown[]) => tryPublicRecipeAction(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const SOURCE_ID = "11111111-1111-4111-8111-111111111111";

function renderButton() {
  return render(
    <LocaleProvider locale="es" dict={es}>
      <TryRecipeButton username="luciav60" attemptId={SOURCE_ID} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  push.mockReset();
  tryPublicRecipeAction.mockReset().mockResolvedValue({
    success: true,
    data: {
      userId: "me",
      coffeeId: "my-coffee",
      coffeeBagId: "my-bag",
      coffeeName: "Guji",
      roaster: "La Semilla",
      method: "v60",
      sourceAttempt: {
        id: SOURCE_ID,
        attempt_no: 0,
        method: "v60",
        dose_g: 18,
        water_g: 290,
        dilution_water_g: null,
        target_weight_g: null,
        temperature_c: 94,
        target_time_ms: 165000,
        grind_setting: null,
        grinder_upper_burr: 18,
        grinder_lower_burr: null,
        moka_cup_size: null,
        cup_count: null,
        heat_intensity: null,
        equipment_id: null,
        grinder_id: null,
        equipment_snapshot: {},
      },
      defaultEquipment: { id: "my-v60", model_name: "Mi V60" },
      defaultGrinder: { id: "my-grinder", model_name: "Mi molinillo" },
      recipeSource: { attemptId: SOURCE_ID, username: "luciav60", grind: "18", grinderModelName: "Comandante C40" },
    },
  });
});

describe("TryRecipeButton", () => {
  it("opens a brew with the author's numbers on your own coffee and gear, crediting them", async () => {
    renderButton();
    expect(screen.getByText(es.publicProfile.tryRecipeHint)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.tryRecipe }));

    expect(tryPublicRecipeAction).toHaveBeenCalledWith({ username: "luciav60", attemptId: SOURCE_ID });
    const draftId = push.mock.calls[0][0].split("/").pop();
    const draft = loadDraft(draftId)!;
    expect(draft).toMatchObject({
      coffeeId: "my-coffee",
      coffeeBagId: "my-bag",
      recipeSource: { attemptId: SOURCE_ID, username: "luciav60", grind: "18", grinderModelName: "Comandante C40" },
    });
    // Not one of your attempts: nothing links back to it as a parent.
    expect(draft.parentAttemptId).toBeUndefined();
    expect(draft.parentAttemptNo).toBeUndefined();
    expect(draft.recipe).toMatchObject({
      doseG: 18,
      waterG: 290,
      temperatureC: 94,
      grinderUpperBurr: 18,
      equipmentId: "my-v60",
      grinderId: "my-grinder",
      grinderModelName: "Mi molinillo",
    });
  });

  it("says so when the recipe is no longer available", async () => {
    tryPublicRecipeAction.mockResolvedValue({ success: false, message: es.publicProfile.tryRecipeUnavailable });
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: es.publicProfile.tryRecipe }));
    expect(screen.getByRole("alert")).toHaveTextContent(es.publicProfile.tryRecipeUnavailable);
    expect(push).not.toHaveBeenCalled();
  });
});
