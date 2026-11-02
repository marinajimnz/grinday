"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputClassName } from "@/components/ui/Field";
import { IconBuscar } from "@/components/icons/pencil-icons";
import { cn } from "@/lib/cn";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// The shelf offers the two bag states you choose a coffee by: one already
// open, or one waiting to be. "Terminada" is left out because a coffee whose
// bags are all finished is history, and "Archivada" because archiving is a
// coffee-level action (coffees.archived_at) that listCoffees hides outright:
// that option could only ever match a bag someone set to "archived" by hand,
// and it read as a broken filter because it always came back empty.
// Archived coffees live in Inventario > Archivadas instead.
export const SHELF_BAG_STATUS_FILTERS = ["", "open", "sealed"] as const;

export function CoffeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const t = dict.coffees.shelf;
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bagStatus = searchParams.get("bagStatus") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const labels: Record<(typeof SHELF_BAG_STATUS_FILTERS)[number], string> = {
    "": t.filterAll,
    open: t.filterOpen,
    sealed: t.filterSealed,
  };

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <IconBuscar
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={dict.coffees.searchPlaceholder}
          aria-label={dict.coffees.searchLabel}
          className={`${inputClassName} pl-9`}
        />
      </div>

      <div role="group" aria-label={dict.coffees.filterBagStatus} className="flex flex-wrap justify-center gap-2">
        {SHELF_BAG_STATUS_FILTERS.map((status) => {
          const active = status === bagStatus;
          return (
            <button
              key={status || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => updateParam("bagStatus", status)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                active ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink",
              )}
            >
              {labels[status]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
