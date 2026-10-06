"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BagFieldsFieldset } from "./BagFieldsFieldset";
import { bagFieldsSchema } from "@/lib/validation/coffees";
import { addBagAction } from "@/features/coffees/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

const formSchema = z.object({ bag: bagFieldsSchema });
type FormValues = z.infer<typeof formSchema>;

export function AddBagForm({
  coffeeId,
  onCancel,
}: {
  coffeeId: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { bag: { inventoryMode: "none", status: "sealed" } },
  });

  // Bag status is a computed field, not a choice — see BagFieldsFieldset.
  const openedAt = useWatch({ control, name: "bag.openedAt" });
  useEffect(() => {
    setValue("bag.status", openedAt ? "open" : "sealed");
  }, [openedAt, setValue]);

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await addBagAction({ coffeeId, bag: values.bag });
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      router.push(`/bags/${result.data.bagId}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-card border border-border bg-surface p-5"
    >
      <BagFieldsFieldset register={register} watch={watch} autoStatus errors={errors.bag} />
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          <LoadingLabel loading={isPending}>{dict.coffees.addBag}</LoadingLabel>
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.common.cancel}
        </Button>
      </div>
    </form>
  );
}
