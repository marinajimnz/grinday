"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CoffeeFieldsFieldset } from "./CoffeeFieldsFieldset";
import { coffeeFieldsSchema } from "@/lib/validation/coffees";
import { updateCoffeeAction } from "@/features/coffees/actions";
import type { CoffeeRow } from "@/features/coffees/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";

const formSchema = z.object({ coffee: coffeeFieldsSchema });
type FormValues = z.infer<typeof formSchema>;

export function EditCoffeeForm({
  coffee,
  onSaved,
  onCancel,
}: {
  coffee: CoffeeRow;
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
      coffee: {
        name: coffee.name,
        roaster: coffee.roaster,
        country: coffee.country ?? undefined,
        region: coffee.region ?? undefined,
        farm: coffee.farm ?? undefined,
        producer: coffee.producer ?? undefined,
        varieties: coffee.varieties ?? [],
        process: coffee.process ?? undefined,
        altitudeMinM: coffee.altitude_min_m ?? undefined,
        altitudeMaxM: coffee.altitude_max_m ?? undefined,
        roastLevel: (coffee.roast_level as FormValues["coffee"]["roastLevel"]) ?? undefined,
        tastingNotes: coffee.tasting_notes ?? [],
      },
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateCoffeeAction({ coffeeId: coffee.id, coffee: values.coffee });
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-card border border-border bg-surface p-5">
      <CoffeeFieldsFieldset register={register} control={control} errors={errors.coffee} />
      {formError && (
        <p role="alert" className="text-sm text-red-700">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60"
        >
          {isPending ? dict.common.saving : dict.coffees.saveChanges}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-input border border-border px-4 text-sm font-medium text-ink"
        >
          {dict.common.cancel}
        </button>
      </div>
    </form>
  );
}
