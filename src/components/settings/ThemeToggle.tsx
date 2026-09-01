"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { applyTheme, getStoredTheme, type ThemePreference } from "@/features/theme/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>("system");

  useEffect(() => {
    // localStorage doesn't exist during SSR/prerender — this can only be
    // read client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(getStoredTheme());
  }, []);

  return (
    <div role="radiogroup" aria-label="Tema" className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={theme === opt.value}
          onClick={() => {
            setTheme(opt.value);
            applyTheme(opt.value);
          }}
          className={cn(
            "min-h-11 flex-1 rounded-input border text-sm font-medium transition-colors",
            theme === opt.value
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
