"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MethodSelectCards } from "./MethodSelectCards";
import { MethodModelsStep } from "./MethodModelsStep";
import { addBrewEquipmentBatchAction } from "@/features/equipment/actions";
import { BREW_METHODS, type BrewMethod } from "@/features/equipment/constants";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { useHideBottomNav } from "@/components/ui/BottomNavVisibility";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/ui/StepHeader";

export function NewEquipmentWizard() {
  const router = useRouter();
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<BrewMethod[]>([]);
  const [modelsByMethod, setModelsByMethod] = useState<Record<string, string[]>>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useHideBottomNav(true);

  function toggleMethod(method: BrewMethod) {
    setSelected((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]));
  }

  function updateModels(method: BrewMethod, next: string[]) {
    setModelsByMethod((prev) => ({ ...prev, [method]: next }));
  }

  const orderedSelected = BREW_METHODS.filter((m) => selected.includes(m));
  const canSave = orderedSelected.every((m) => (modelsByMethod[m]?.length ?? 0) > 0);

  function handleNext() {
    if (step === 0) {
      if (!selected.length) return;
      setStep(1);
      return;
    }
    if (!canSave) return;
    setFormError(null);
    startTransition(async () => {
      const entries = orderedSelected.map((method) => ({
        method,
        modelNames: modelsByMethod[method] ?? [],
      }));
      const result = await addBrewEquipmentBatchAction({ entries });
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      router.push("/settings/machines");
    });
  }

  function handleBack() {
    if (step === 1) setStep(0);
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleNext();
  }

  const isLastStep = step === 1;
  const nextDisabled = step === 0 ? selected.length === 0 : !canSave;

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Button type="button" variant="secondary" onClick={() => setConfirmExit(true)}>
            {dict.equipment.exit}
          </Button>
        </div>

        {/* The step line used to carry a number and nothing else — two
            steps, and no way to know what the second one would ask for
            until you got there. */}
        <StepHeader
          step={step + 1}
          total={2}
          name={step === 0 ? dict.equipment.stepNameMethods : dict.equipment.stepNameModels}
          onBack={step > 0 ? handleBack : undefined}
        />

        {step === 0 ? (
          <MethodSelectCards selected={selected} onToggle={toggleMethod} />
        ) : (
          <MethodModelsStep methods={orderedSelected} modelsByMethod={modelsByMethod} onChange={updateModels} />
        )}

        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending || nextDisabled} className="flex-1">
            <LoadingLabel loading={isPending} loadingText={dict.common.saving}>
              {isLastStep ? dict.equipment.saveEquipment : dict.equipment.continueLabel}
            </LoadingLabel>
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmExit}
        message={dict.equipment.exitConfirm}
        onConfirm={() => router.push("/settings/machines")}
        onCancel={() => setConfirmExit(false)}
      />
    </>
  );
}
