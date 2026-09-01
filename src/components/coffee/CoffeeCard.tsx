import Link from "next/link";
import { Coffee as CoffeeIcon } from "lucide-react";
import { BagStatusBadge } from "./BagStatusBadge";
import { ROAST_LEVEL_LABELS, type ROAST_LEVELS } from "@/features/coffees/constants";
import type { CoffeeListItem } from "@/features/coffees/queries";

export function CoffeeCard({ coffee }: { coffee: CoffeeListItem }) {
  const activeBag =
    coffee.bags.find((b) => b.status === "open") ?? coffee.bags[0] ?? null;

  return (
    <Link
      href={`/coffees/${coffee.id}`}
      className="block overflow-hidden rounded-card border border-border bg-surface transition-shadow hover:shadow-soft"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-canvas">
        <CoffeeIcon aria-hidden className="size-10 text-coffee" />
      </div>
      <div className="p-4">
        <p className="text-xs font-medium text-ink-muted">{coffee.roaster}</p>
        <p className="font-display text-lg text-ink">{coffee.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {coffee.country && (
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-muted">
              {coffee.country}
            </span>
          )}
          {coffee.process && (
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-muted">
              {coffee.process}
            </span>
          )}
          {coffee.roast_level && (
            <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-muted">
              {ROAST_LEVEL_LABELS[coffee.roast_level as (typeof ROAST_LEVELS)[number]] ??
                coffee.roast_level}
            </span>
          )}
          {activeBag && <BagStatusBadge status={activeBag.status} />}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {coffee.bags.length} {coffee.bags.length === 1 ? "bolsa" : "bolsas"}
        </p>
      </div>
    </Link>
  );
}
