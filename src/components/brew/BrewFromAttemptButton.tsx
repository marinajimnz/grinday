"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { startBrewFromAttemptAction } from "@/features/brew/actions";
import { buildDraftFromRecipe, saveDraft } from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";

// "Duplicar y ajustar" / "Usar como base": re-brewing a past attempt is the
// same act as any other preparation, so it goes through the live brew flow
// (recipe → timer → photo → result) seeded from that attempt, exactly like
// the dashboard's "Preparar". The old plain form at /attempts/new is only
// for logging a shot by hand.
export function BrewFromAttemptButton({
  attemptId,
  variant = "secondary",
  fullWidth,
  className,
  children,
}: {
  attemptId: string;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startBrewFromAttemptAction({ attemptId });
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
      });
      saveDraft(draft);
      router.push(`/brew/live/${draft.draftId}`);
    });
  }

  return (
    <>
      <Button
        variant={variant}
        fullWidth={fullWidth}
        className={className}
        disabled={isPending}
        onClick={handleClick}
      >
        <LoadingLabel loading={isPending} loadingText={dict.common.loading}>
          {children}
        </LoadingLabel>
      </Button>
      {error && (
        // w-full so it drops onto its own line when this sits in a
        // flex-wrap row of buttons (the attempt page) instead of squeezing
        // in between them; a no-op in the compare table's cell.
        <p role="alert" className="mt-2 w-full text-sm text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
