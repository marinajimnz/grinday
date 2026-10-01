"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { EditBagForm } from "./EditBagForm";
import { BagStatusBadge } from "./BagStatusBadge";
import { InventoryAdjustPanel } from "@/components/inventory/InventoryAdjustPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconCafe, IconEliminar } from "@/components/icons/pencil-icons";
import { formatRemaining } from "@/features/inventory/format";
import {
  deleteBagAction,
  getBagDeletionImpactAction,
  setBagFinishedAction,
} from "@/features/coffees/actions";
import { formatDeletionImpact, type DeletionImpact } from "@/features/coffees/deletionImpact";
import type { CoffeeBagRow } from "@/features/coffees/queries";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format-date";

export function BagDetailPanel({ bag, cups = 0 }: { bag: CoffeeBagRow; cups?: number }) {
  const router = useRouter();
  const dict = useDictionary();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isFinishing, startFinish] = useTransition();
  const [finishError, setFinishError] = useState<string | null>(null);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);

  // Deleting a bag takes the attempts brewed from it with it, so the
  // confirmation says how many rather than leaving the user to find out.
  useEffect(() => {
    if (!confirmDeleteOpen) return;
    let active = true;
    void getBagDeletionImpactAction(bag.id).then((result) => {
      if (active && result.success) setImpact(result.data);
    });
    return () => {
      active = false;
    };
  }, [confirmDeleteOpen, bag.id]);

  function fmt(value: string | null) {
    return value ? formatDate(value, locale) : dict.coffees.noDate;
  }

  const isFinished = bag.status === "finished";

  function handleToggleFinished() {
    setFinishError(null);
    startFinish(async () => {
      const result = await setBagFinishedAction(bag.id, !isFinished);
      if (!result.success) {
        setFinishError(result.message);
        return;
      }
      router.refresh();
    });
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
      {/* Three actions do not fit beside the badge on a phone — the third
          one pushed the other two off the edge. The badge keeps its own
          line there and the buttons go underneath; from sm up they go back
          to sharing the row. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2">
          <BagStatusBadge status={bag.status} dict={dict} />
          {bag.lot_label && <span className="text-xs text-ink-muted">{bag.lot_label}</span>}
        </div>
        {/* The three do not fit on one phone row — 208 + 86 + 140px of button
            against 318px of card — so on a phone they sit in two columns with
            the wide one across the top, rather than wrapping and leaving the
            third one adrift beside a gap. From sm up they share a row. */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:shrink-0">
          {/* Finishing a bag is the thing you actually do to a bag, so it
              sits out here with edit and delete rather than three taps deep
              inside the edit form's status picker. */}
          <Button
            variant="secondary"
            className="col-span-2 px-3"
            disabled={isFinishing}
            onClick={handleToggleFinished}
          >
            <IconCafe aria-hidden className="size-4" />
            {isFinished ? dict.coffees.reopenBag : dict.coffees.markFinished}
          </Button>
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
              setImpact(null);
              setConfirmDeleteOpen(true);
            }}
          >
            <IconEliminar aria-hidden className="size-4" />
            {dict.coffees.deleteBag}
          </Button>
        </div>
      </div>

      {(deleteError || finishError) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {deleteError ?? finishError}
        </p>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        message={`${dict.coffees.deleteBagConfirm} ${impact ? formatDeletionImpact(dict, impact) : ""}`.trim()}
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
        <div>
          <dt className="text-ink-muted">{dict.coffees.cupsFromBag}</dt>
          <dd className="flex items-baseline gap-1 text-ink">
            <span className="font-display text-lg tabular-nums">{cups}</span>
            <span className="text-xs text-ink-muted">{dict.coffees.cupsApprox}</span>
          </dd>
        </div>
      </dl>

      {/* Said once, under the number: it counts the brews you wrote down,
          which is not the same as the brews you made. */}
      <p className="mt-2 text-xs text-ink-muted">{dict.coffees.cupsFromBagHint}</p>

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
            {/* Only when there is a quantity. formatRemaining falls back to
                "Sin seguimiento" when there isn't, which the line above has
                already said — the panel printed it twice, once as the mode and
                again as the figure. It also said it under "Gramos (báscula)"
                for a bag that is tracked but has no weight recorded yet, which
                was not a repetition but a contradiction. The inventory list
                keeps the fallback: there the figure stands alone. */}
            {bag.inventory_mode !== "none" && bag.remaining_g != null && (
              <p className="mt-1 font-display text-lg text-ink">{formatRemaining(bag, dict)}</p>
            )}
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
