import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BagStatusBadge } from "./BagStatusBadge";
import type { CoffeeBagRow } from "@/features/coffees/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/types";
import { formatDate } from "@/lib/i18n/format-date";

export function BagListItem({
  bag,
  dict,
  locale,
}: {
  bag: CoffeeBagRow;
  dict: Dictionary;
  locale: Locale;
}) {
  const roast = bag.roast_date ? formatDate(bag.roast_date, locale) : null;
  const purchase = bag.purchase_date ? formatDate(bag.purchase_date, locale) : null;

  return (
    <Link
      href={`/bags/${bag.id}`}
      className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-4"
    >
      <div>
        <div className="flex items-center gap-2">
          <BagStatusBadge status={bag.status} dict={dict} />
          {bag.lot_label && <span className="text-xs text-ink-muted">{bag.lot_label}</span>}
        </div>
        <p className="mt-1.5 text-sm text-ink">
          {roast ? `${dict.coffees.roastedOn} ${roast}` : dict.coffees.noRoastDate}
          {purchase ? ` · ${dict.coffees.purchaseOn} ${purchase}` : ""}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </Link>
  );
}
