"use client";

import { useState } from "react";
import { ChevronRight, ChevronUp } from "lucide-react";
import { BagStatusBadge } from "./BagStatusBadge";
import { BagDetailPanel } from "./BagDetailPanel";
import { BagMediaSection } from "./BagMediaSection";
import type { CoffeeBagRow, CoffeeMediaRow } from "@/features/coffees/queries";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format-date";

export function BagAccordionItem({
  bag,
  media,
}: {
  bag: CoffeeBagRow;
  media: (CoffeeMediaRow & { url: string | null })[];
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const purchase = bag.purchase_date ? formatDate(bag.purchase_date, locale) : null;

  if (expanded) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted"
        >
          <ChevronUp aria-hidden className="size-3.5" />
          {dict.coffees.bagLabel}
        </button>
        <BagDetailPanel bag={bag} />
        <div className="mt-6">
          <h3 className="font-display text-lg text-ink">{dict.inventoryPage.gallery}</h3>
          <div className="mt-3">
            <BagMediaSection bagId={bag.id} media={media} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      data-bag-id={bag.id}
      className="flex w-full items-center justify-between gap-4 rounded-card border border-border bg-surface p-4 text-left"
    >
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {dict.coffees.bagLabel}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <BagStatusBadge status={bag.status} dict={dict} />
          <span className="text-sm text-ink">
            {purchase ? `${dict.coffees.purchaseOn} ${purchase}` : dict.coffees.noDate}
          </span>
        </div>
      </div>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </button>
  );
}
