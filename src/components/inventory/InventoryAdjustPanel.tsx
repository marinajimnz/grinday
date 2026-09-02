"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { inputClassName } from "@/components/ui/Field";
import { adjustInventoryAction } from "@/features/inventory/actions";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function InventoryAdjustPanel({
  coffeeBagId,
  currentRemainingG,
}: {
  coffeeBagId: string;
  currentRemainingG: number | null;
}) {
  const router = useRouter();
  const dict = useDictionary();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentRemainingG ?? 0);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
      >
        <Scale aria-hidden className="size-4" />
        {dict.inventoryPage.adjustInventory}
      </button>
    );
  }

  return (
    <div className="rounded-input border border-border bg-canvas p-4">
      <label htmlFor="inventory-adjust-value" className="mb-1.5 block text-sm font-medium text-ink">
        {dict.inventoryPage.currentRemaining}
      </label>
      <input
        id="inventory-adjust-value"
        type="number"
        min={0}
        className={inputClassName}
        value={value}
        onChange={(e) => setValue(e.target.valueAsNumber || 0)}
      />
      <label htmlFor="inventory-adjust-note" className="mb-1.5 mt-3 block text-sm font-medium text-ink">
        {dict.inventoryPage.note} <span className="font-normal text-ink-muted">{dict.inventoryPage.optional}</span>
      </label>
      <input
        id="inventory-adjust-note"
        className={inputClassName}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={dict.inventoryPage.notePlaceholder}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await adjustInventoryAction({
                coffeeBagId,
                newRemainingG: value,
                note,
              });
              if (!result.success) {
                setError(result.message);
                return;
              }
              setEditing(false);
              router.refresh();
            })
          }
          className="min-h-11 rounded-input bg-ink px-4 text-sm font-medium text-surface disabled:opacity-60"
        >
          {isPending ? dict.common.saving : dict.common.save}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-11 rounded-input border border-border px-4 text-sm font-medium text-ink"
        >
          {dict.common.cancel}
        </button>
      </div>
    </div>
  );
}
