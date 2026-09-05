"use client";

import { METHOD_ICONS } from "@/components/equipment/MethodSelectCards";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import type { BrewMethod } from "@/features/equipment/constants";

export function BrewMethodSelectCards({
  methods,
  onSelect,
}: {
  methods: BrewMethod[];
  onSelect: (method: BrewMethod) => void;
}) {
  const dict = useDictionary();

  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((method) => {
        const Icon = METHOD_ICONS[method];
        return (
          <button
            key={method}
            type="button"
            onClick={() => onSelect(method)}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface p-4 text-center text-ink transition hover:border-ink"
          >
            <Icon className="size-7" aria-hidden />
            <span className="text-sm font-semibold">{dict.equipment.methodLabels[method]}</span>
          </button>
        );
      })}
    </div>
  );
}
