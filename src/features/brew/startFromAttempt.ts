import { buildDraftFromRecipe, saveDraft } from "./draft";
import { startBrewFromAttemptAction } from "./actions";
import type { BrewMethod } from "@/features/equipment/constants";

/**
 * Starts a new brew seeded from an attempt: asks the server which bag to
 * brew from, saves the draft locally and returns its id for /brew/live. The
 * attempt row's "Preparar" and the recipe stack's "Repetir" both go through
 * here, so repeating a brew is the same thing wherever you tap it.
 */
export async function startBrewFromAttempt(
  attemptId: string,
  method: BrewMethod,
): Promise<{ draftId: string } | { error: string }> {
  const result = await startBrewFromAttemptAction({ attemptId });
  if (!result.success) return { error: result.message };
  const draft = buildDraftFromRecipe({
    userId: result.data.userId,
    coffeeId: result.data.coffeeId,
    coffeeBagId: result.data.coffeeBagId,
    coffeeName: result.data.coffeeName,
    roaster: result.data.roaster,
    roastDate: result.data.roastDate,
    method,
    sourceAttempt: result.data.sourceAttempt,
  });
  saveDraft(draft);
  return { draftId: draft.draftId };
}
