"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { EditBagForm } from "./EditBagForm";
import { BagStatusBadge } from "./BagStatusBadge";
import { InventoryAdjustPanel } from "@/components/inventory/InventoryAdjustPanel";
import { INVENTORY_MODE_LABELS } from "@/features/coffees/constants";
import { formatRemaining } from "@/features/inventory/format";
import type { CoffeeBagRow } from "@/features/coffees/queries";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BagDetailPanel({ bag }: { bag: CoffeeBagRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

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
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BagStatusBadge status={bag.status} />
          {bag.lot_label && <span className="text-xs text-ink-muted">{bag.lot_label}</span>}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-input border border-border px-3 text-sm font-medium text-ink"
        >
          <Pencil aria-hidden className="size-4" />
          Editar
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">Tueste</dt>
          <dd className="text-ink">{formatDate(bag.roast_date)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Compra</dt>
          <dd className="text-ink">{formatDate(bag.purchase_date)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Apertura</dt>
          <dd className="text-ink">{formatDate(bag.opened_at)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Primer intento</dt>
          <dd className="text-ink">{formatDate(bag.first_brew_at)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Finalización</dt>
          <dd className="text-ink">{formatDate(bag.finished_at)}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-muted">Inventario</p>
            <p className="mt-1 text-sm text-ink">
              {INVENTORY_MODE_LABELS[bag.inventory_mode as keyof typeof INVENTORY_MODE_LABELS]}
              {bag.package_weight_g ? ` · Paquete: ${bag.package_weight_g} g` : ""}
              {bag.inventory_mode === "approximate_shots" && bag.estimated_dose_g
                ? ` · Dosis estimada: ${bag.estimated_dose_g} g`
                : ""}
            </p>
            <p className="mt-1 font-display text-lg text-ink">{formatRemaining(bag)}</p>
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
