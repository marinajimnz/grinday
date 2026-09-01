import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BagStatusBadge } from "@/components/coffee/BagStatusBadge";
import { formatRemaining } from "@/features/inventory/format";
import type { InventoryBagRow } from "@/features/inventory/queries";

export function BagInventoryRow({ bag }: { bag: InventoryBagRow }) {
  return (
    <Link
      href={`/bags/${bag.id}`}
      className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-4"
    >
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{bag.coffee.roaster}</p>
        <p className="truncate font-display text-base text-ink">{bag.coffee.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <BagStatusBadge status={bag.status} />
          <span className="text-sm text-ink">{formatRemaining(bag)}</span>
        </div>
      </div>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </Link>
  );
}
