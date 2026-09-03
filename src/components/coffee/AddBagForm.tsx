"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BagFieldsFieldset } from "./BagFieldsFieldset";
import { bagFieldsSchema } from "@/lib/validation/coffees";
import { addBagAction } from "@/features/coffees/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";

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
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { bag: { inventoryMode: "none", status: "sealed" } },
  });

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
      <BagFieldsFieldset register={register} control={control} errors={errors.bag} />
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
          <LoadingLabel loading={isPending}>{dict.coffees.addBag}</LoadingLabel>
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
