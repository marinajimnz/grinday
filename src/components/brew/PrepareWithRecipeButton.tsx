"use client";

import { useRouter } from "next/navigation";
import { buildDraftFromRecipe, saveDraft, type RecipeSourceAttempt } from "@/features/brew/draft";

export function PrepareWithRecipeButton({
  coffeeId,
  coffeeBagId,
  coffeeName,
  roaster,
  sourceAttempt,
  className,
  children = "Preparar con esta receta",
}: {
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  sourceAttempt?: RecipeSourceAttempt | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const draft = buildDraftFromRecipe({
          coffeeId,
          coffeeBagId,
          coffeeName,
          roaster,
          sourceAttempt,
        });
        saveDraft(draft);
        router.push(`/brew/live/${draft.draftId}`);
      }}
    >
      {children}
    </button>
  );
}
