import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BagStatusBadge } from "./BagStatusBadge";
import type { CoffeeBagRow } from "@/features/coffees/queries";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BagListItem({ bag }: { bag: CoffeeBagRow }) {
  const roast = formatDate(bag.roast_date);
  const purchase = formatDate(bag.purchase_date);

  return (
    <Link
      href={`/bags/${bag.id}`}
      className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-4"
    >
      <div>
        <div className="flex items-center gap-2">
          <BagStatusBadge status={bag.status} />
          {bag.lot_label && <span className="text-xs text-ink-muted">{bag.lot_label}</span>}
        </div>
        <p className="mt-1.5 text-sm text-ink">
          {roast ? `Tueste ${roast}` : "Sin fecha de tueste"}
          {purchase ? ` · Compra ${purchase}` : ""}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </Link>
  );
}
