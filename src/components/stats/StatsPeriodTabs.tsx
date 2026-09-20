"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { STATS_PERIODS, type StatsPeriod } from "@/features/stats/period";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// Semana / Mes / Año, as a tablist rather than three buttons: each one
// swaps the whole panel below it, which is what a tab is, and it gives
// arrow-key movement for free from the browser's own handling of the role.
export function StatsPeriodTabs({ active }: { active: StatsPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useDictionary();

  function select(period: StatsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label={dict.stats.periodLabel}
      className="flex gap-1 rounded-full bg-canvas p-1"
    >
      {STATS_PERIODS.map((period) => {
        const selected = period === active;
        return (
          <button
            key={period}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(period)}
            className={cn(
              "min-h-11 flex-1 rounded-full px-3 text-sm font-medium transition-colors",
              selected ? "bg-ink text-surface" : "text-ink-muted",
            )}
          >
            {dict.stats[period]}
          </button>
        );
      })}
    </div>
  );
}
