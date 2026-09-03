"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function StatsDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useDictionary();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const hasFilter = Boolean(searchParams.get("from") || searchParams.get("to"));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="stats-from" className="mb-1.5 block text-xs font-medium text-ink-muted">
            {dict.stats.from}
          </label>
          <input
            id="stats-from"
            type="date"
            className={inputClassName}
            value={searchParams.get("from") ?? ""}
            onChange={(e) => updateParam("from", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="stats-to" className="mb-1.5 block text-xs font-medium text-ink-muted">
            {dict.stats.to}
          </label>
          <input
            id="stats-to"
            type="date"
            className={inputClassName}
            value={searchParams.get("to") ?? ""}
            onChange={(e) => updateParam("to", e.target.value)}
          />
        </div>
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="min-h-11 text-sm text-ink-muted underline"
        >
          {dict.stats.removeFilter}
        </button>
      )}
    </div>
  );
}
