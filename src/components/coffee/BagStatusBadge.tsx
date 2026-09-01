import { cn } from "@/lib/cn";
import { BAG_STATUS_LABELS, BAG_STATUSES } from "@/features/coffees/constants";

const STYLES: Record<(typeof BAG_STATUSES)[number], string> = {
  sealed: "bg-canvas text-ink-muted",
  open: "bg-coffee/15 text-coffee",
  finished: "bg-border text-ink-muted",
  archived: "bg-border/60 text-ink-muted",
};

export function BagStatusBadge({ status }: { status: string }) {
  const key = status as (typeof BAG_STATUSES)[number];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STYLES[key] ?? STYLES.sealed,
      )}
    >
      {BAG_STATUS_LABELS[key] ?? status}
    </span>
  );
}
