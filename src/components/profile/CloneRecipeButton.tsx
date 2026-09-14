"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/Button";
import { buildDraftFromRecipe, saveDraft } from "@/features/brew/draft";
import { cloneRecipeAction } from "@/features/social/actions";
import type { BrewMethod } from "@/features/equipment/constants";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";

export function CloneRecipeButton({
  sourceAttemptId,
  dict,
  className,
}: {
  sourceAttemptId: string;
  dict: Dictionary;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await cloneRecipeAction(sourceAttemptId);
      if (!result.success) {
        setError(result.message);
        return;
      }

      const draft = buildDraftFromRecipe({
        userId: result.data.userId,
        coffeeId: result.data.coffeeId,
        coffeeBagId: result.data.coffeeBagId,
        coffeeName: result.data.coffeeName,
        roaster: result.data.roaster,
        method: (result.data.sourceAttempt?.method as BrewMethod) ?? "espresso",
        sourceAttempt: result.data.sourceAttempt,
        defaultEquipment: result.data.defaultEquipment,
        defaultGrinder: result.data.defaultGrinder,
        clonedFromAttemptId: result.data.clonedFromAttemptId,
      });
      // buildDraftFromRecipe sets parentAttemptId/parentAttemptNo from
      // sourceAttempt too — that field means "your own prior attempt of
      // this coffee" (the "Basado en intento #N" lineage), which doesn't
      // apply to a recipe cloned from someone else. Clear it here rather
      // than in the shared helper, so every other caller keeps working.
      saveDraft({ ...draft, parentAttemptId: undefined, parentAttemptNo: undefined });
      router.push(`/brew/live/${draft.draftId}`);
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className={buttonClassName("primary", { className })}
      >
        {dict.profile.tryThisRecipe}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
