"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { EditBagForm } from "./EditBagForm";
import { BagStatusBadge } from "./BagStatusBadge";
import { InventoryAdjustPanel } from "@/components/inventory/InventoryAdjustPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconEliminar } from "@/components/icons/pencil-icons";
import { formatRemaining } from "@/features/inventory/format";
import { deleteBagAction } from "@/features/coffees/actions";
import type { CoffeeBagRow } from "@/features/coffees/queries";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format-date";

export function BagDetailPanel({ bag }: { bag: CoffeeBagRow }) {
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function fmt(value: string | null) {
    return value ? formatDate(value, locale) : dict.coffees.noDate;
  }

  function handleDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteBagAction(bag.id);
      if (!result.success) {
        setConfirmDeleteOpen(false);
        setDeleteError(result.message);
        return;
      }
      router.push(`/coffees/${bag.coffee_id}`);
    });
  }

  if (editing) {
    return (
      <EditBagForm
        bag={bag}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5" data-bag-id={bag.id}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BagStatusBadge status={bag.status} dict={dict} />
          {bag.lot_label && <span className="text-xs text-ink-muted">{bag.lot_label}</span>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="px-3" onClick={() => setEditing(true)}>
            <Pencil aria-hidden className="size-4" />
            {dict.common.edit}
          </Button>
          <Button
            variant="destructive"
            className="px-3"
            disabled={isDeleting}
            onClick={() => {
              setDeleteError(null);
              setConfirmDeleteOpen(true);
            }}
          >
            <IconEliminar aria-hidden className="size-4" />
            {dict.coffees.deleteBag}
          </Button>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {deleteError}
        </p>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        message={dict.coffees.deleteBagConfirm}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">{dict.coffees.roastShort}</dt>
          <dd className="text-ink">{fmt(bag.roast_date)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{dict.coffees.purchaseShort}</dt>
          <dd className="text-ink">{fmt(bag.purchase_date)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{dict.coffees.openedShort}</dt>
          <dd className="text-ink">{fmt(bag.opened_at)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{dict.coffees.firstAttemptShort}</dt>
          <dd className="text-ink">{fmt(bag.first_brew_at)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{dict.coffees.finishedShort}</dt>
          <dd className="text-ink">{fmt(bag.finished_at)}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">{dict.coffees.inventoryMode}</p>
            <p className="mt-1 text-sm text-ink">
              {dict.enums.inventoryMode[bag.inventory_mode as keyof typeof dict.enums.inventoryMode]}
              {bag.package_weight_g ? ` · ${dict.coffees.package}: ${bag.package_weight_g} g` : ""}
              {bag.inventory_mode === "approximate_shots" && bag.estimated_dose_g
                ? ` · ${dict.coffees.estimatedDoseShort}: ${bag.estimated_dose_g} g`
                : ""}
            </p>
            <p className="mt-1 font-display text-lg text-ink">{formatRemaining(bag, dict)}</p>
          </div>
        </div>
        {bag.inventory_mode !== "none" && (
          <div className="mt-3">
            <InventoryAdjustPanel coffeeBagId={bag.id} currentRemainingG={bag.remaining_g} />
          </div>
        )}
      </div>
    </div>
  );
}
