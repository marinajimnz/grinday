"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AttemptFieldsFieldset } from "./AttemptFieldsFieldset";
import { attemptFieldsSchema } from "@/lib/validation/attempts";
import { createAttemptAction } from "@/features/attempts/actions";
import type { BrewAttemptRow } from "@/features/attempts/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

const formSchema = z.object({ attempt: attemptFieldsSchema });
type FormValues = z.infer<typeof formSchema>;

function prefillFromParent(parent?: BrewAttemptRow | null): Partial<FormValues["attempt"]> {
  if (!parent) return { usedBitMore: false };
  return {
    grindSetting: parent.grind_setting ?? undefined,
    grindSeconds: parent.grind_seconds ?? undefined,
    doseMode: (parent.dose_mode as FormValues["attempt"]["doseMode"]) ?? undefined,
    usedBitMore: parent.used_bit_more,
    basketSize: (parent.basket_size as FormValues["attempt"]["basketSize"]) ?? undefined,
    basketWall: (parent.basket_wall as FormValues["attempt"]["basketWall"]) ?? undefined,
    temperatureOffsetC: parent.temperature_offset_c ?? undefined,
    upperBurrSetting: parent.upper_burr_setting ?? undefined,
    shotMode: (parent.shot_mode as FormValues["attempt"]["shotMode"]) ?? undefined,
    preinfusionMs: parent.preinfusion_ms ?? undefined,
  };
}

export function CreateAttemptForm({
  coffeeBagId,
  parentAttempt,
}: {
  coffeeBagId: string;
  parentAttempt?: BrewAttemptRow | null;
}) {
  const router = useRouter();
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
    defaultValues: { attempt: prefillFromParent(parentAttempt) },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createAttemptAction({
        coffeeBagId,
        parentAttemptId: parentAttempt?.id,
        attempt: values.attempt,
      });
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      router.push(`/attempts/${result.data.attemptId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {parentAttempt && (
        <p className="rounded-input bg-canvas px-4 py-3 text-sm text-ink-muted">
          {dict.attempts.basedOnAttempt} #{parentAttempt.attempt_no}{dict.attempts.basedOnAttemptSuffix}
        </p>
      )}
      <AttemptFieldsFieldset register={register} control={control} errors={errors.attempt} />
      {formError && (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60 sm:w-auto"
      >
        {isPending ? dict.common.saving : dict.attempts.saveAttempt}
      </button>
    </form>
  );
}
