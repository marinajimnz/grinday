"use client";

import { cn } from "@/lib/cn";

export function TasteScale({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  id: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {value !== undefined && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-xs text-ink-muted underline"
          >
            Limpiar
          </button>
        )}
      </div>
      <div id={id} role="radiogroup" aria-label={label} className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "flex size-11 flex-1 items-center justify-center rounded-input border text-sm font-medium transition-colors",
              value === n
                ? "border-ink bg-ink text-surface"
                : "border-border bg-surface text-ink-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
