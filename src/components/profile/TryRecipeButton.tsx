"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClassName } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { buildDraftFromRecipe, saveDraft } from "@/features/brew/draft";
import { tryPublicRecipeAction } from "@/features/profile/tryRecipe";

// "Try this recipe" on someone's public attempt: the server puts the coffee
// in your library; then, like "Prepare with this recipe" on your own, a
// brew draft is seeded here and the live brew opens. The draft is your
// own — your equipment and grinder — and remembers whose recipe it was.
export function TryRecipeButton({
  username,
  attemptId,
  label,
  showHint = true,
  className,
}: {
  username: string;
  attemptId: string;
  label?: string;
  showHint?: boolean;
  className?: string;
}) {
  const t = useDictionary().publicProfile;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={isPending}
        className={buttonClassName("primary", { fullWidth: true })}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await tryPublicRecipeAction({ username, attemptId });
            if (!result.success) {
              setError(result.message);
              return;
            }
            const data = result.data;
            const draft = buildDraftFromRecipe({
              userId: data.userId,
              coffeeId: data.coffeeId,
              coffeeBagId: data.coffeeBagId,
              coffeeName: data.coffeeName,
              roaster: data.roaster,
              roastDate: data.roastDate,
              method: data.method,
              sourceAttempt: data.sourceAttempt,
              defaultEquipment: data.defaultEquipment,
              defaultGrinder: data.defaultGrinder,
            });
            // Not one of your attempts: no "based on attempt #n" link back.
            draft.parentAttemptId = undefined;
            draft.parentAttemptNo = undefined;
            draft.recipeSource = data.recipeSource;
            saveDraft(draft);
            router.push(`/brew/live/${draft.draftId}`);
          });
        }}
      >
        <LoadingLabel loading={isPending} loadingText={t.tryingRecipe}>
          {label ?? t.tryRecipe}
        </LoadingLabel>
      </button>
      {showHint && !error && <p className="mt-2 text-center text-xs text-ink-muted">{t.tryRecipeHint}</p>}
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
