"use client";

import { Field, noZoomTextClassName } from "@/components/ui/Field";
import { useDictionary } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/cn";

// The @handle input: the "@" is drawn, not typed, and whatever is typed is
// lowercased as you go, so what you see is what gets saved.
export function HandleField({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const dict = useDictionary();

  return (
    <Field label={dict.settings.handle} htmlFor={id} hint={dict.settings.handleHint} error={error ?? undefined}>
      <div className="flex min-h-11 w-full items-center rounded-input border border-border bg-surface px-3 focus-within:border-ink">
        <span aria-hidden className={cn("text-ink-muted", noZoomTextClassName)}>
          @
        </span>
        <input
          id={id}
          className={cn("min-w-0 flex-1 bg-transparent pl-0.5 text-ink outline-none", noZoomTextClassName)}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/^@+/, "").toLowerCase())}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          aria-invalid={error ? true : undefined}
        />
      </div>
    </Field>
  );
}
