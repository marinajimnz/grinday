"use client";

import { useState } from "react";
import { ChevronRight, ChevronUp } from "lucide-react";
import { IconCafe } from "@/components/icons/pencil-icons";
import { BagStatusBadge } from "./BagStatusBadge";
import { BagDetailPanel } from "./BagDetailPanel";
import { BagMediaSection } from "./BagMediaSection";
import type { CoffeeBagRow, CoffeeMediaRow, SharedCoverPhoto } from "@/features/coffees/queries";
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider";
import { formatDate } from "@/lib/i18n/format-date";
import { daysSinceRoast, formatRoastAge } from "@/features/coffees/roastAge";

export function BagAccordionItem({
  bag,
  media,
  sharedPhoto = null,
  cups = 0,
}: {
  bag: CoffeeBagRow;
  media: (CoffeeMediaRow & { url: string | null })[];
  sharedPhoto?: SharedCoverPhoto | null;
  cups?: number;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const purchase = bag.purchase_date ? formatDate(bag.purchase_date, locale) : null;
  // Only while there's coffee left in it: how old a finished bag got says
  // nothing about the next cup.
  const roastDays = bag.status === "finished" ? null : daysSinceRoast(bag.roast_date);

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
        <BagDetailPanel bag={bag} cups={cups} />
        <div className="mt-6">
          <h3 className="font-display text-lg text-ink">{dict.inventoryPage.gallery}</h3>
          <div className="mt-3">
            <BagMediaSection bagId={bag.id} media={media} sharedPhoto={sharedPhoto} />
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
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <BagStatusBadge status={bag.status} dict={dict} />
          <span className="text-sm text-ink">
            {purchase ? `${dict.coffees.purchaseOn} ${purchase}` : dict.coffees.noDate}
          </span>

          {/* What the bag actually gave you, without opening it. */}
          {cups > 0 && (
            <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
              <IconCafe aria-hidden className="size-3.5" />
              <span className="tabular-nums">{cups}</span>
            </span>
          )}
        </div>
        {/* Its own line: squeezed in after the date it wrapped on a phone
            and started the second line with a stray separator. */}
        {roastDays !== null && (
          <p className="mt-1 text-sm text-ink-muted first-letter:uppercase">
            {formatRoastAge(roastDays, dict.coffees.roastAge)}
          </p>
        )}
      </div>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
    </button>
  );
}
