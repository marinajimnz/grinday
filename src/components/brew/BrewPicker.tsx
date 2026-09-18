"use client";

import Image from "next/image";
import type { BrewableCoffee } from "@/features/attempts/queries";
import type { BrewMethod } from "@/features/equipment/constants";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { IconCafe as CoffeeIcon, IconFavorita } from "@/components/icons/pencil-icons";

export function BrewPicker({
  coffees,
  method,
  onSelect,
  disabled,
}: {
  coffees: BrewableCoffee[];
  // Chosen in step 1, so the badge can tell whether the preferred recipe has
  // anything to say about the brew you're actually starting.
  method: BrewMethod;
  onSelect: (coffee: BrewableCoffee) => void;
  disabled?: boolean;
}) {
  const dict = useDictionary();

  return (
    <ul className="space-y-3">
      {coffees.map((coffee) => (
        <li key={coffee.coffeeId}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(coffee)}
            className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-4 text-left disabled:opacity-60"
          >
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-input bg-canvas">
              {coffee.coverPhotoUrl ? (
                <Image
                  src={coffee.coverPhotoUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <CoffeeIcon aria-hidden className="size-5 text-coffee" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-muted">{coffee.roaster}</p>
              <p className="truncate font-display text-base text-ink">{coffee.name}</p>
              {coffee.preferredAttempt?.method === method ? (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-coffee">
                  <IconFavorita aria-hidden className="size-3" />
                  {dict.brew.preferredRecipeAttempt} #{coffee.preferredAttempt.attempt_no}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-ink-muted">{dict.brew.noPreferredYet}</p>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
