"use client";

import { Minus, Plus } from "lucide-react";
import { useDictionary } from "@/components/i18n/LocaleProvider";

export function MetricStepper({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const dict = useDictionary();
  const current = value ?? 0;

  function clamp(n: number) {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return Math.round(v * 10) / 10;
  }

  return (
    <div className="text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-1.5 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label={`${dict.ui.decrease} ${label}`}
          onClick={() => onChange(clamp(current - step))}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink"
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <span className="min-w-16 font-display text-3xl tabular-nums text-ink">
          {value ?? "—"}
          {value !== undefined && suffix ? <span className="text-lg">{suffix}</span> : null}
        </span>
        <button
          type="button"
          aria-label={`${dict.ui.increase} ${label}`}
          onClick={() => onChange(clamp(current + step))}
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface text-ink"
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
