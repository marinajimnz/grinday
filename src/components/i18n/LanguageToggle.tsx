"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/types";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "es", label: "ESP" },
  { value: "en", label: "ENG" },
];

export function LanguageToggle({
  onChange,
  disabled,
}: {
  onChange: (locale: Locale) => void;
  disabled?: boolean;
}) {
  const locale = useLocale();

  return (
    <div role="radiogroup" aria-label="Idioma / Language" className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={locale === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-9 rounded-input border px-3 text-xs font-medium tracking-wide transition-colors disabled:opacity-60",
            locale === opt.value
              ? "border-ink bg-ink text-surface"
              : "border-border bg-surface text-ink-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
