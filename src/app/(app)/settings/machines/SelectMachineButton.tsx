"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { setDefaultMachineAction } from "./actions";

export function SelectMachineButton({
  machineModelId,
  isDefault,
}: {
  machineModelId: string;
  isDefault: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (isDefault) {
    return (
      <span className="inline-flex min-h-11 items-center gap-1.5 rounded-input bg-canvas px-4 text-sm font-medium text-ink">
        <Check aria-hidden className="size-4" />
        Predeterminada
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await setDefaultMachineAction(machineModelId);
        })
      }
      className={cn(
        "min-h-11 rounded-input bg-ink px-4 text-sm font-medium text-surface transition-opacity",
        isPending && "opacity-60",
      )}
    >
      {isPending ? "Guardando..." : "Usar como predeterminada"}
    </button>
  );
}
