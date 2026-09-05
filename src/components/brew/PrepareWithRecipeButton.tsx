"use client";

import { useRouter } from "next/navigation";
import { buildDraftFromRecipe, saveDraft, type RecipeSourceAttempt } from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";

export function PrepareWithRecipeButton({
  coffeeId,
  coffeeBagId,
  coffeeName,
  roaster,
  sourceAttempt,
  className,
  children,
}: {
  coffeeId: string;
  coffeeBagId: string;
  coffeeName: string;
  roaster: string;
  sourceAttempt?: RecipeSourceAttempt | null;
  className?: string;
  children: React.ReactNode;
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
          // The source attempt already carries the method it was brewed
          // with — this shortcut skips the method/coffee picker entirely.
          method: (sourceAttempt?.method as BrewMethod) ?? "espresso",
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
