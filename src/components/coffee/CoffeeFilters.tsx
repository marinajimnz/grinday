"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { inputClassName, noZoomTextClassName } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  BAG_STATUSES,
  PROCESS_OPTIONS,
  ROAST_LEVELS,
} from "@/features/coffees/constants";
import { useDictionary } from "@/components/i18n/LocaleProvider";

// "Archivada" is deliberately not offered here. Archiving is a coffee-level
// action (it stamps coffees.archived_at), and listCoffees hides archived
// coffees outright — so the option could only ever match a bag someone set
// to "archived" by hand on the edit form, and never an actually archived
// coffee. It looked like a broken filter because it always came back empty.
// Archived coffees live in Inventario > Archivadas instead.
const FILTERABLE_BAG_STATUSES = BAG_STATUSES.filter((status) => status !== "archived");

export function CoffeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
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

      <div className="flex flex-wrap gap-2">
        <select
          aria-label={dict.coffees.filterProcess}
          className={cn(
            "min-h-11 rounded-input border border-border bg-surface px-3 text-ink",
            noZoomTextClassName,
          )}
          value={searchParams.get("process") ?? ""}
          onChange={(e) => updateParam("process", e.target.value)}
        >
          <option value="">{dict.coffees.allProcesses}</option>
          {PROCESS_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {dict.enums.process[p]}
            </option>
          ))}
        </select>

        <select
          aria-label={dict.coffees.filterRoast}
          className={cn(
            "min-h-11 rounded-input border border-border bg-surface px-3 text-ink",
            noZoomTextClassName,
          )}
          value={searchParams.get("roastLevel") ?? ""}
          onChange={(e) => updateParam("roastLevel", e.target.value)}
        >
          <option value="">{dict.coffees.allRoasts}</option>
          {ROAST_LEVELS.map((level) => (
            <option key={level} value={level}>
              {dict.enums.roastLevel[level]}
            </option>
          ))}
        </select>

        <select
          aria-label={dict.coffees.filterBagStatus}
          className={cn(
            "min-h-11 rounded-input border border-border bg-surface px-3 text-ink",
            noZoomTextClassName,
          )}
          value={searchParams.get("bagStatus") ?? ""}
          onChange={(e) => updateParam("bagStatus", e.target.value)}
        >
          <option value="">{dict.coffees.anyBagStatus}</option>
          {FILTERABLE_BAG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {dict.enums.bagStatus[status]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
