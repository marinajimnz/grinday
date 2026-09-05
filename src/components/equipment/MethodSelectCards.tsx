"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import {
  IconAeropress,
  IconChemex,
  IconEspresso,
  IconMoka,
  IconOtros,
  IconPrensa,
  IconV60,
} from "@/components/icons/pencil-icons";
import { BREW_METHODS, type BrewMethod } from "@/features/equipment/constants";

const METHOD_ICONS: Record<BrewMethod, typeof IconEspresso> = {
  espresso: IconEspresso,
  v60: IconV60,
  chemex: IconChemex,
  aeropress: IconAeropress,
  prensa: IconPrensa,
  moka: IconMoka,
  otros: IconOtros,
};

export function MethodSelectCards({
  selected,
  onToggle,
}: {
  selected: BrewMethod[];
  onToggle: (method: BrewMethod) => void;
}) {
  const dict = useDictionary();

  return (
    <div>
      <h2 className="font-display text-4xl text-ink">{dict.equipment.chooseMethodsTitle}</h2>
      <p className="mt-1 text-sm text-ink-muted">{dict.equipment.chooseMethodsSubtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {BREW_METHODS.map((method) => {
          const Icon = METHOD_ICONS[method];
          const isSelected = selected.includes(method);
          return (
            <button
              key={method}
              type="button"
              onClick={() => onToggle(method)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-card border p-4 text-center transition",
                isSelected
                  ? "border-ink bg-ink text-surface"
                  : "border-border bg-surface text-ink hover:border-ink",
              )}
            >
              {isSelected && (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-surface text-ink">
                  <Check className="size-3.5" aria-hidden />
                </span>
              )}
              <Icon className="size-7" aria-hidden />
              <span className="text-sm font-semibold">{dict.equipment.methodLabels[method]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
