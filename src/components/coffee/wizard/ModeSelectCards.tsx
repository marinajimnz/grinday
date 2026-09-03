"use client";

import { useDictionary } from "@/components/i18n/LocaleProvider";
import { BolsaIcon, GranoIcon } from "./PencilIcons";
import type { CoffeeWizardMode } from "./types";

export function ModeSelectCards({ onSelect }: { onSelect: (mode: CoffeeWizardMode) => void }) {
  const dict = useDictionary();

  return (
    <div>
      <h2 className="font-display text-xl text-ink">{dict.coffees.chooseModeTitle}</h2>
      <p className="mt-1 text-sm text-ink-muted">{dict.coffees.chooseModeSubtitle}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("basic")}
          className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 text-left transition hover:border-ink hover:shadow-sm"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink">
            <GranoIcon className="size-6" />
          </span>
          <span className="font-display text-lg font-bold text-ink">{dict.coffees.modeBasicTitle}</span>
          <span className="text-sm text-ink-muted">{dict.coffees.modeBasicDescription}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("complete")}
          className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 text-left transition hover:border-ink hover:shadow-sm"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-ink/5 text-ink">
            <BolsaIcon className="size-6" />
          </span>
          <span className="font-display text-lg font-bold text-ink">{dict.coffees.modeCompleteTitle}</span>
          <span className="text-sm text-ink-muted">{dict.coffees.modeCompleteDescription}</span>
        </button>
      </div>
    </div>
  );
}
