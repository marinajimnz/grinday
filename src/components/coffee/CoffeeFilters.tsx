"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { inputClassName } from "@/components/ui/Field";
import {
  BAG_STATUSES,
  BAG_STATUS_LABELS,
  PROCESS_LABELS,
  PROCESS_OPTIONS,
  ROAST_LEVEL_LABELS,
  ROAST_LEVELS,
} from "@/features/coffees/constants";

export function CoffeeFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
          placeholder="Buscar por nombre, tostador, país…"
          aria-label="Buscar cafés"
          className={`${inputClassName} pl-9`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filtrar por proceso"
          className="min-h-11 rounded-input border border-border bg-surface px-3 text-sm text-ink"
          value={searchParams.get("process") ?? ""}
          onChange={(e) => updateParam("process", e.target.value)}
        >
          <option value="">Todos los procesos</option>
          {PROCESS_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {PROCESS_LABELS[p]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por tueste"
          className="min-h-11 rounded-input border border-border bg-surface px-3 text-sm text-ink"
          value={searchParams.get("roastLevel") ?? ""}
          onChange={(e) => updateParam("roastLevel", e.target.value)}
        >
          <option value="">Todos los tuestes</option>
          {ROAST_LEVELS.map((level) => (
            <option key={level} value={level}>
              {ROAST_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por estado de bolsa"
          className="min-h-11 rounded-input border border-border bg-surface px-3 text-sm text-ink"
          value={searchParams.get("bagStatus") ?? ""}
          onChange={(e) => updateParam("bagStatus", e.target.value)}
        >
          <option value="">Cualquier estado de bolsa</option>
          {BAG_STATUSES.map((status) => (
            <option key={status} value={status}>
              {BAG_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
