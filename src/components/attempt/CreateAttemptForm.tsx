"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AttemptFieldsFieldset } from "./AttemptFieldsFieldset";
import { attemptFieldsSchema } from "@/lib/validation/attempts";
import { createAttemptAction } from "@/features/attempts/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { LoadingLabel } from "@/components/ui/LoadingLabel";
import { Button } from "@/components/ui/Button";

const formSchema = z.object({ attempt: attemptFieldsSchema });
type FormValues = z.infer<typeof formSchema>;

// Logging a shot by hand, from scratch. Re-brewing a past attempt does NOT
// come through here — it goes through the live brew flow (see
// BrewFromAttemptButton), same as any other preparation.
export function CreateAttemptForm({ coffeeBagId }: { coffeeBagId: string }) {
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
    defaultValues: { attempt: { usedBitMore: false } },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createAttemptAction({
        coffeeBagId,
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
      <AttemptFieldsFieldset register={register} control={control} errors={errors.attempt} />
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={isPending} fullWidth className="sm:w-auto">
        <LoadingLabel loading={isPending}>{dict.attempts.saveAttempt}</LoadingLabel>
      </Button>
    </form>
  );
}
