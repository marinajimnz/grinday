"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BrewMethodSelectCards } from "./BrewMethodSelectCards";
import { BrewPicker } from "./BrewPicker";
import { BrewStepHeader } from "./BrewStepHeader";
import { startBrewAction } from "@/features/brew/actions";
import { buildDraftFromRecipe, saveDraft } from "@/features/brew/draft";
import type { BrewMethod } from "@/features/equipment/constants";
import type { BrewableCoffee } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

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
        <BrewStepHeader step={1} title={dict.brew.chooseMethodTitle} />
        <p className="mt-1 text-sm text-ink-muted">{dict.brew.chooseMethodSubtitle}</p>
        <div className="mt-6">
          <BrewMethodSelectCards methods={availableMethods} onSelect={setMethod} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setMethod(null)}
        className="min-h-11 rounded-input border border-border px-4 text-sm font-medium text-ink"
      >
        {dict.common.back}
      </button>

      <div className="mt-4">
        <BrewStepHeader step={2} title={dict.brew.chooseCoffeeTitle} />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6">
        <BrewPicker coffees={coffees} onSelect={handleSelectCoffee} disabled={isPending} />
      </div>
    </div>
  );
}
