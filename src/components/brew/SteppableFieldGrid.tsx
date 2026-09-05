"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { MetricStepper } from "@/components/ui/MetricStepper";

export type SteppableField = {
  key: string;
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  sublabel?: string;
};

// One shared +/- control up top, acting on whichever card below is
// selected — instead of every field owning its own pair of buttons. Tap a
// card to make it the active one; hold-to-repeat (from MetricStepper)
// still applies to the shared control.
export function SteppableFieldGrid({ fields }: { fields: SteppableField[] }) {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(fields[0]?.key);

  // Falls back to the first field instead of syncing selectedKey via an
  // effect — e.g. right after switching brew method drops the previously
  // selected field from the list.
  const selected = fields.find((f) => f.key === selectedKey) ?? fields[0];
  if (!selected) return null;

  return (
    <div className="space-y-6">
      <MetricStepper
        label={selected.label}
        value={selected.value}
        onChange={selected.onChange}
        step={selected.step}
        min={selected.min}
        max={selected.max}
        suffix={selected.suffix}
      />

      <div className="grid grid-cols-2 gap-3">
        {fields.map((field) => {
          const isSelected = field.key === selected.key;
          return (
            <button
              key={field.key}
              type="button"
              onClick={() => setSelectedKey(field.key)}
              className={cn(
                "rounded-card border p-4 text-center transition",
                isSelected ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink",
              )}
            >
              <p
                className={cn(
                  "text-xs font-medium uppercase tracking-wide",
                  isSelected ? "text-surface/70" : "text-ink-muted",
                )}
              >
                {field.label}
              </p>
              <p className="mt-1 font-display text-4xl">
                {field.value !== undefined ? `${field.value}${field.suffix ?? ""}` : "—"}
              </p>
              {field.sublabel && (
                <p className={cn("mt-0.5 text-[11px]", isSelected ? "text-surface/70" : "text-ink-muted")}>
                  {field.sublabel}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
