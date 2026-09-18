"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrewMethodSelectCards } from "./BrewMethodSelectCards";
import { BrewPicker } from "./BrewPicker";
import { startBrewAction } from "@/features/brew/actions";
import { buildDraftFromRecipe, saveDraft } from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";
import type { BrewableCoffee } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { StepHeader } from "@/components/ui/StepHeader";

export function NewBrewWizard({
  availableMethods,
  coffees,
}: {
  availableMethods: BrewMethod[];
  coffees: BrewableCoffee[];
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [method, setMethod] = useState<BrewMethod | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSelectCoffee(coffee: BrewableCoffee) {
    if (!method) return;
    setError(null);
    startTransition(async () => {
      const result = await startBrewAction({ coffeeId: coffee.coffeeId, method });
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
        method,
        sourceAttempt: result.data.sourceAttempt,
        defaultEquipment: result.data.defaultEquipment,
        defaultGrinder: result.data.defaultGrinder,
      });
      saveDraft(draft);
      router.push(`/brew/live/${draft.draftId}`);
    });
  }

  if (!method) {
    return (
      <div>
        <StepHeader step={1} name={dict.brew.stepNameMethod} heading={dict.brew.chooseMethodTitle} />
        <p className="mt-1 text-sm text-ink-muted">{dict.brew.chooseMethodSubtitle}</p>
        <div className="mt-6">
          <BrewMethodSelectCards methods={availableMethods} onSelect={setMethod} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        step={2}
        name={dict.brew.stepNameCoffee}
        heading={dict.brew.chooseCoffeeTitle}
        onBack={() => setMethod(null)}
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6">
        <BrewPicker coffees={coffees} method={method} onSelect={handleSelectCoffee} disabled={isPending} />
      </div>
    </div>
  );
}
