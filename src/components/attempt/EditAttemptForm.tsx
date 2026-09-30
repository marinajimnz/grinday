"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AttemptFieldsFieldset } from "./AttemptFieldsFieldset";
import { editableAttemptFieldsSchema } from "@/lib/validation/attempts";
import { updateAttemptAction } from "@/features/attempts/actions";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

const formSchema = z.object({ attempt: editableAttemptFieldsSchema });
type FormValues = z.infer<typeof formSchema>;

export function EditAttemptForm({
  attempt,
  onSaved,
  onCancel,
}: {
  attempt: BrewAttemptRow;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      attempt: {
        grindSetting: attempt.grind_setting ?? undefined,
        grindSeconds: attempt.grind_seconds ?? undefined,
        doseMode: (attempt.dose_mode as FormValues["attempt"]["doseMode"]) ?? undefined,
        doseFeedback: (attempt.dose_feedback as FormValues["attempt"]["doseFeedback"]) ?? undefined,
        basketSize: (attempt.basket_size as FormValues["attempt"]["basketSize"]) ?? undefined,
        basketType: (attempt.basket_type as FormValues["attempt"]["basketType"]) ?? undefined,
        temperatureOffsetC: attempt.temperature_offset_c ?? undefined,
        shotMode: (attempt.shot_mode as FormValues["attempt"]["shotMode"]) ?? undefined,
        extractionMs: attempt.extraction_ms ?? undefined,
        inputWeightG: attempt.input_weight_g ?? undefined,
        outputWeightG: attempt.output_weight_g ?? undefined,
        acidity: attempt.acidity ?? undefined,
        sweetness: attempt.sweetness ?? undefined,
        bitterness: attempt.bitterness ?? undefined,
        body: attempt.body ?? undefined,
        intensity: attempt.intensity ?? undefined,
        balance: attempt.balance ?? undefined,
        overallRating: attempt.overall_rating ?? undefined,
        notes: attempt.notes ?? undefined,
      },
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateAttemptAction({ attemptId: attempt.id, attempt: values.attempt });
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rounded-card border border-border bg-surface p-5">
      <p className="text-xs text-ink-muted">
        {dict.attempts.correctNote} #{attempt.attempt_no} {dict.attempts.correctNoteSuffix}
      </p>
      <AttemptFieldsFieldset register={register} control={control} errors={errors.attempt} />
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          <LoadingLabel loading={isPending}>{dict.coffees.saveChanges}</LoadingLabel>
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.common.cancel}
        </Button>
      </div>
    </form>
  );
}
