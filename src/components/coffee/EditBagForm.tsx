"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BagFieldsFieldset } from "./BagFieldsFieldset";
import { bagFieldsSchema } from "@/lib/validation/coffees";
import { updateBagAction } from "@/features/coffees/actions";
import type { CoffeeBagRow } from "@/features/coffees/queries";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

const formSchema = z.object({ bag: bagFieldsSchema });
type FormValues = z.infer<typeof formSchema>;

export function EditBagForm({
  bag,
  onSaved,
  onCancel,
}: {
  bag: CoffeeBagRow;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bag: {
        roastDate: bag.roast_date ?? undefined,
        purchaseDate: bag.purchase_date ?? undefined,
        openedAt: bag.opened_at ?? undefined,
        firstBrewAt: bag.first_brew_at ?? undefined,
        finishedAt: bag.finished_at ?? undefined,
        packageWeightG: bag.package_weight_g ?? undefined,
        inventoryMode: bag.inventory_mode as FormValues["bag"]["inventoryMode"],
        estimatedDoseG: bag.estimated_dose_g ?? undefined,
        status: bag.status as FormValues["bag"]["status"],
        lotLabel: bag.lot_label ?? undefined,
      },
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateBagAction({ bagId: bag.id, bag: values.bag });
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      onSaved();
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-card border border-border bg-surface p-5"
    >
      <BagFieldsFieldset register={register} errors={errors.bag} />
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
